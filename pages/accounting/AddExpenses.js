import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { FiDollarSign } from 'react-icons/fi';

const AddExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [date, setDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [loading, setLoading] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryExpenses, setCategoryExpenses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [lawyerId, setLawyerId] = useState(null);

  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) return;

        const { data: myMeta, error: metaError } = await supabase
          .from('user_metadata')
          .select('admin_user_id, new_lawyer_id, user_id, role')
          .or(`user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`)
          .limit(1);

        if (!metaError && myMeta && myMeta.length > 0) {
          const row = myMeta.find(m => m.new_lawyer_id === user.id) || myMeta[0];

          if (row.admin_user_id) {
            setAdminId(row.admin_user_id);
          } else {
            setAdminId(user.id); // If no admin_user_id, they are the admin
          }

          if (row.new_lawyer_id === user.id) {
            setLawyerId(user.id);
          }
        } else {
          setAdminId(user.id);
        }
      } catch (error) {
        console.error('Error fetching admin ID:', error.message);
      }
    };
    fetchUserContext();
  }, []);

  const expenseCategories = [
    'مصاريف الوقود',
    'الرواتب',
    'أثاث المكاتب',
    'أجهزة تكنولوجيا المعلومات',
    'أجهزة الكمبيوتر',
    'مصاريف مكتبية',
    'مصاريف خارجية',
    'مصاريف العمولة',
    'مصاريف الإدارة المباشرة',
  ];

  const clearForm = () => {
    setDate('');
    setExpenseCategory('');
    setNotes('');
    setAmount('');
    setCurrency('IQD');
  };

  useEffect(() => {
    if (adminId) {
      fetchExpenses();
    }
  }, [adminId]);

  const fetchExpenses = async () => {
    if (!adminId) return;
    try {
      let query = supabase.from('office_expenses').select('*').eq('admin_id', adminId).order('date', { ascending: false });

      if (filterStartDate) {
        query = query.gte('date', filterStartDate);
      }
      if (filterEndDate) {
        query = query.lte('date', filterEndDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchCategoryExpenses = async (category) => {
    if (!adminId) return;
    try {
      const { data, error } = await supabase
        .from('office_expenses')
        .select('*')
        .eq('expenses_category', category)
        .eq('admin_id', adminId)
        .order('date', { ascending: false });

      if (error) throw error;
      setCategoryExpenses(data || []);
    } catch (error) {
      console.error('Error fetching category expenses:', error);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    fetchCategoryExpenses(category);
  };

  const handleBackToSummary = () => {
    setSelectedCategory(null);
    setCategoryExpenses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !expenseCategory || !amount) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('office_expenses')
          .update({
            date,
            expenses_category: expenseCategory,
            notes,
            amount: parseFloat(amount),
            currency,
          })
          .eq('id', editExpenseId);

        if (error) throw error;
        alert('تم تعديل المصروف بنجاح');
      } else {
        const { error } = await supabase
          .from('office_expenses')
          .insert([
            {
              date,
              expenses_category: expenseCategory,
              notes,
              amount: parseFloat(amount),
              currency,
              admin_id: adminId,
              lawyer_id: lawyerId,
            },
          ]);

        if (error) throw error;
        alert('تمت إضافة المصاريف بنجاح');
      }

      await fetchExpenses();
      if (selectedCategory) {
        await fetchCategoryExpenses(selectedCategory);
      }

      clearForm();
      setShowAddExpenseForm(false);
      setIsEditing(false);
      setEditExpenseId(null);
    } catch (error) {
      console.error('Error adding/updating expense:', error);
      alert(`حدث خطأ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    setIsEditing(true);
    setEditExpenseId(expense.id);
    setDate(expense.date);
    setExpenseCategory(expense.expenses_category);
    setNotes(expense.notes);
    setAmount(expense.amount);
    setCurrency(expense.currency || 'IQD');
    setShowAddExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmDelete = confirm('هل أنت متأكد من حذف هذا المصروف؟');
    if (confirmDelete) {
      try {
        const { error } = await supabase
          .from('office_expenses')
          .delete()
          .eq('id', expenseId);

        if (error) throw error;
        alert('تم حذف المصروف بنجاح');
        await fetchExpenses();
        if (selectedCategory) {
          await fetchCategoryExpenses(selectedCategory);
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert(`حدث خطأ: ${error.message}`);
      }
    }
  };

  const handleFilter = async () => {
    await fetchExpenses();
  };

  const calculateExpenseSummaries = () => {
    const summaries = {};
    expenses.forEach((expense) => {
      const currency = expense.currency || 'IQD';
      if (!summaries[expense.expenses_category]) {
        summaries[expense.expenses_category] = {
          count: 0,
          total: 0,
          last_update: expense.date,
          currencies: {},
        };
      }

      summaries[expense.expenses_category].count += 1;
      summaries[expense.expenses_category].total += parseFloat(expense.amount || 0);

      // Group by currency
      if (!summaries[expense.expenses_category].currencies[currency]) {
        summaries[expense.expenses_category].currencies[currency] = 0;
      }
      summaries[expense.expenses_category].currencies[currency] += parseFloat(expense.amount || 0);

      if (new Date(expense.date) > new Date(summaries[expense.expenses_category].last_update)) {
        summaries[expense.expenses_category].last_update = expense.date;
      }
    });

    Object.keys(summaries).forEach((category) => {
      summaries[category].last_update = formatDate(summaries[category].last_update);
    });
    return summaries;
  };

  const getCurrencySymbol = (currency) => {
    if (currency === 'IQD') return 'د.ع';
    if (currency === 'USD') return '$';
    return currency;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
  };

  const handlePrint = () => {
    console.log('Print clicked - expenses.length:', expenses.length);

    if (expenses.length === 0) {
      alert('لا توجد بيانات للطباعة');
      return;
    }

    console.log('Proceeding to print with', expenses.length, 'expenses');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const summaries = calculateExpenseSummaries();

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>تقرير المصاريف</title>
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
          .summary-section {
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #000;
            padding: 15px;
            margin: 10px 0;
            background-color: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="header">
          <h2>تقرير المصاريف</h2>
        </div>
        <div class="summary-section">
          <h3>ملخص المصاريف حسب الفئة</h3>
          ${Object.entries(summaries).map(([category, data]) => `
            <div class="summary-card">
              <strong>الفئة:</strong> ${category}<br>
              <strong>عدد المصاريف:</strong> ${data.count}<br>
              <strong>إجمالي المبلغ:</strong> ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ع<br>
              <strong>آخر تحديث:</strong> ${data.last_update}
            </div>
          `).join('')}
        </div>
        <h3>تفاصيل جميع المصاريف</h3>
        <table>
          <thead>
            <tr>
              <th>رقم</th>
              <th>التاريخ</th>
              <th>فئة المصاريف</th>
              <th>المبلغ</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map((expense, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.expenses_category}</td>
                <td>${parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getCurrencySymbol(expense.currency || 'IQD')}</td>
                <td>${expense.notes || '-'}</td>
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
    <>
      <div className="expenses-container">
        {/* Filters and Button - No Header Container */}
        {!selectedCategory && (
          <div className="filters-container">
            <div className="filters" style={{ direction: 'rtl' }}>
              <h3>تصنيف بالتواريخ</h3>
              <div className="date-filter-group">
                <div className="date-input-wrapper">
                  <label htmlFor="start-date">من:</label>
                  <input
                    id="start-date"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        if (e.target.showPicker && typeof e.target.showPicker === 'function') {
                          e.target.showPicker();
                        }
                      } catch (error) {
                        // showPicker requires user gesture, ignore error
                      }
                    }}
                    className="date-input"
                  />
                </div>
                <div className="date-input-wrapper">
                  <label htmlFor="end-date">إلى:</label>
                  <input
                    id="end-date"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        if (e.target.showPicker && typeof e.target.showPicker === 'function') {
                          e.target.showPicker();
                        }
                      } catch (error) {
                        // showPicker requires user gesture, ignore error
                      }
                    }}
                    className="date-input"
                  />
                </div>
                <button onClick={handleFilter} className="filter-btn">
                  تصنيف
                </button>
              </div>
            </div>
            <button
              className="primary-btn"
              onClick={() => {
                clearForm();
                setIsEditing(false);
                setShowAddExpenseForm(true);
              }}
            >
              إضافة مصاريف جديدة
            </button>
            <button onClick={handlePrint} className="print-btn">
              طباعة التقرير
            </button>
          </div>
        )}

        {selectedCategory ? (
          <>
            <div className="details-header-container">
              <h2 className="detail-header">تفاصيل المصاريف لفئة: {selectedCategory}</h2>
              <button className="back-btn" onClick={handleBackToSummary}>
                العودة إلى القائمة
              </button>
            </div>
            <div className="expenses-table-wrapper">
              {categoryExpenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <FiDollarSign className="empty-icon" />
                  </div>
                  <p>لا توجد بيانات لهذه الفئة</p>
                </div>
              ) : (
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>رقم</th>
                      <th>التاريخ</th>
                      <th>فئة المصاريف</th>
                      <th>المبلغ</th>
                      <th>ملاحظة</th>
                      <th>تعديل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryExpenses.map((expense, index) => (
                      <tr key={expense.id}>
                        <td data-label="رقم">{index + 1}</td>
                        <td data-label="التاريخ">{formatDate(expense.date)}</td>
                        <td data-label="فئة المصاريف">{expense.expenses_category}</td>
                        <td data-label="المبلغ" className="amount-cell">{parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol(expense.currency || 'IQD')}</td>
                        <td data-label="ملاحظة">{expense.notes || '-'}</td>
                        <td data-label="تعديل" className="action-buttons-cell">
                          <button className="action-btn edit-btn" onClick={() => handleEditExpense(expense)}>تعديل</button>{' '}
                          <button className="action-btn delete-btn" onClick={() => handleDeleteExpense(expense.id)}>حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <>

            <div className="summary-cards-wrapper">
              <div className="summary-card">
                <div className="summary-card-icon"><FiDollarSign /></div>
                <div className="summary-card-content">
                  <span className="summary-card-title">إجمالي المصاريف</span>
                  <span className="summary-card-value">
                    {Object.values(calculateExpenseSummaries()).reduce((acc, curr) => acc + curr.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ع
                  </span>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card-icon"><FiDollarSign /></div>
                <div className="summary-card-content">
                  <span className="summary-card-title">عدد العمليات</span>
                  <span className="summary-card-value">
                    {Object.values(calculateExpenseSummaries()).reduce((acc, curr) => acc + curr.count, 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="summary-table-wrapper">
              {Object.keys(calculateExpenseSummaries()).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <FiDollarSign className="empty-icon" />
                  </div>
                  <p>لا توجد مصاريف مضافة حالياً</p>
                  <button
                    className="primary-btn mt-4"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      clearForm();
                      setIsEditing(false);
                      setShowAddExpenseForm(true);
                    }}
                  >
                    إضافة أول مصروف لك
                  </button>
                </div>
              ) : (
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>رقم</th>
                      <th>فئة المصاريف</th>
                      <th>عدد المصاريف</th>
                      <th>مجموع المصاريف</th>
                      <th>آخر تحديث</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(calculateExpenseSummaries()).map(([category, data], index) => (
                      <tr key={index}>
                        <td data-label="رقم">{index + 1}</td>
                        <td data-label="فئة المصاريف">
                          <button
                            className="category-link"
                            onClick={() => handleCategoryClick(category)}
                          >
                            {category}
                          </button>
                        </td>
                        <td data-label="عدد المصاريف">{data.count}</td>
                        <td data-label="مجموع المصاريف" className="amount-cell">
                          {Object.entries(data.currencies || {}).map(([curr, amount]) => (
                            <span key={curr} style={{ marginLeft: '8px' }}>
                              {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol(curr)}
                            </span>
                          ))}
                        </td>
                        <td data-label="آخر تحديث">{data.last_update}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {showAddExpenseForm && (
          <div className="modal-overlay">
            <div className="add-expense-modal">
              <div className="modal-header">
                <h2>{isEditing ? 'تعديل المصاريف' : 'إضافة مصاريف جديدة'}</h2>
                <button className="close-btn" onClick={() => setShowAddExpenseForm(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    التاريخ: <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    فئة المصاريف: <span className="required">*</span>
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    required
                    className="category-select"
                  >
                    <option value="">اختر...</option>
                    {expenseCategories.map((category, index) => (
                      <option key={index} value={category} className="category-option">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ملاحظة:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="يرجى إدخال ملاحظة"
                  />
                </div>

                <div className="form-group">
                  <label>
                    المبلغ: <span className="required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', width: '70%' }}>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      placeholder="يرجى إدخال المبلغ"
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      required
                      style={{ width: '120px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    >
                      <option value="IQD">د.ع</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowAddExpenseForm(false);
                      setIsEditing(false);
                      setEditExpenseId(null);
                    }}
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'جارٍ الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .expenses-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Filters Container */
        .filters-container {
          margin-bottom: 24px;
          padding: 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .details-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 10px 20px;
          background-color: #f9f9f9;
          border-radius: 5px;
          direction: rtl;
        }

        .detail-header {
          font-size: 18px;
          color: #333;
          margin: 0;
        }

        .back-btn {
          background: #0066cc;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .filters {
          display: flex;
          flex-direction: column;
          direction: rtl;
          gap: 8px;
        }

        .filters h3 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #475569;
        }

        .date-filter-group {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .date-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }

        .date-input-wrapper label {
          color: #475569;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: 0;
          text-align: right;
        }

        .date-input {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9375rem;
          color: #1f2937;
          background: #ffffff;
          transition: all 0.2s ease;
          font-family: 'Almarai', 'Cairo', sans-serif;
          cursor: pointer;
          width: 100%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .date-input:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .date-input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1), 0 2px 8px rgba(37, 99, 235, 0.15);
          background: #f8fafc;
        }

        .date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          padding: 4px;
          margin-left: 8px;
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }

        .date-input::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        .date-input::-webkit-datetime-edit {
          padding: 0;
        }

        .date-input::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }

        .date-input::-webkit-datetime-edit-text {
          color: #64748b;
          padding: 0 4px;
        }

        .date-input::-webkit-datetime-edit-month-field,
        .date-input::-webkit-datetime-edit-day-field,
        .date-input::-webkit-datetime-edit-year-field {
          color: #1f2937;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .date-filter-group {
            flex-direction: column;
            align-items: stretch;
          }

          .date-input-wrapper {
            min-width: 100%;
          }
        }

        .filter-btn {
          background: #2563EB;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .filter-btn:hover {
          background: #1e40af;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .primary-btn {
          background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          white-space: nowrap;
        }

        .primary-btn:hover {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transform: translateY(-1px);
        }

        .print-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
          white-space: nowrap;
        }

        .print-btn:hover {
          background: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .summary-table-wrapper,
        .expenses-table-wrapper {
          overflow-x: auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
          direction: rtl;
        }

        .summary-table,
        .expenses-table {
          width: 100%;
          border-collapse: collapse;
        }

        .summary-table thead,
        .expenses-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          border-bottom: 2px solid #e5e7eb;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        td {
          padding: 16px 24px;
          background: white;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.9375rem;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        tbody tr {
          transition: background-color 0.15s ease;
        }

        tbody tr:hover {
          background-color: #f9fafb;
        }

        tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .category-link {
          background: none;
          border: none;
          color: #0066cc;
          text-decoration: underline;
          cursor: pointer;
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .add-expense-modal {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 500px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          direction: rtl;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          font-size: 18px;
          color: #333;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .form-group {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 15px;
        }

        .form-group label {
          width: 30%;
          min-width: 100px;
          color: #333;
          margin-left: 10px;
          text-align: right;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 70%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        .category-select {
          font-size: 16px;
        }

        .form-group textarea {
          height: 80px;
        }

        .required {
          color: red;
          margin-right: 4px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .submit-btn {
          background: #0066cc;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: white;
          color: #666;
          border: 1px solid #ddd;
          padding: 10px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .cancel-btn:hover {
          background: #f8f9fa;
        }

        .summary-cards-wrapper {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .summary-card-icon {
          background: #eff6ff;
          color: #3b82f6;
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .summary-card-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-card-title {
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 600;
        }

        .summary-card-value {
          font-size: 1.5rem;
          color: #1e293b;
          font-weight: 700;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-icon-wrapper {
          background: #f8fafc;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .empty-icon {
          font-size: 32px;
          color: #cbd5e1;
        }

        .empty-state p {
          font-size: 1.125rem;
          font-weight: 600;
          color: #475569;
          margin: 0;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .edit-btn {
          background: #eff6ff;
          color: #2563eb;
        }

        .edit-btn:hover {
          background: #dbeafe;
        }

        .delete-btn {
          background: #fef2f2;
          color: #dc2626;
        }

        .delete-btn:hover {
          background: #fee2e2;
        }

        @media (max-width: 768px) {
          .filter-action-container {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .primary-btn,
          .filter-btn {
            width: 100%;
            font-size: 16px;
          }

          .expenses-table,
          .summary-table {
            display: block;
          }

          .expenses-table thead,
          .summary-table thead {
            display: none;
          }

          .expenses-table tbody,
          .summary-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .expenses-table tr,
          .summary-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .expenses-table td,
          .summary-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .expenses-table td:last-child,
          .summary-table td:last-child {
            border-bottom: none;
          }

          .expenses-table td::before,
          .summary-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            flex-shrink: 0;
            margin-left: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .table-container,
          .summary-table-wrapper {
            border-radius: 0;
            box-shadow: none;
            border: none;
            overflow: visible;
            background: transparent;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(AddExpenses, ['can_add_fees'], true);
