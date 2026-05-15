

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Layout from '../../components/layout/Layout';
import Modal from 'react-modal';


const AppValues = () => {
  const [caseStates, setCaseStates] = useState([]);
  const [caseStages, setCaseStages] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState('caseState'); // Add this line
  const [courts, setCourts] = useState([]); // New state variable for courts
  const [actionStatuses, setActionStatuses] = useState([]); // New state for action statuses
  const [groupTitleEnglish, setGroupTitleEnglish] = useState(''); // English value for group title
  const [systemValueArabic, setSystemValueArabic] = useState(''); // Arabic system value
  const [systemValueEnglish, setSystemValueEnglish] = useState(''); // English system value
  const [isNewValueModalOpen, setIsNewValueModalOpen] = useState(false);
  const [newFieldValue, setNewFieldValue] = useState('');

  const [originalValue, setOriginalValue] = useState(''); // New state variable to store the original value

  useEffect(() => {
    async function fetchData() {
      try {
        const caseStateData = await supabase
          .from('case_options')
          .select('id, case_state');

        const caseStageData = await supabase
          .from('case_options')
          .select('id, case_stage');

        const caseTypeData = await supabase
          .from('case_options')
          .select('id, case_type');

        const clientTypeData = await supabase
          .from('case_options')
          .select('id, client_type');

        const courtsData = await supabase.from('case_options').select('id, courts');
        const actionStatusData = await supabase.from('case_options').select('id, action_status');


        setCaseStates(caseStateData.data || []);
        setCaseStages(caseStageData.data || []);
        setCaseTypes(caseTypeData.data || []);
        setClientTypes(clientTypeData.data || []);
        setCourts(courtsData.data || []);
        setActionStatuses(actionStatusData.data || []);

      } catch (error) {
        console.error('Error fetching data:', error.message);
      }
    }

    fetchData();
  }, []);

  const getFieldValues = (field) => {
    switch (field) {
      case 'caseState':
        return caseStates.filter((state) => state.case_state !== null).map((state) => state.case_state);
      case 'caseStage':
        return caseStages.filter((stage) => stage.case_stage !== null).map((stage) => stage.case_stage);
      case 'caseType':
        return caseTypes.filter((type) => type.case_type !== null).map((type) => type.case_type);
      case 'clientType':
        // Remove duplicates using Set
        return [...new Set(clientTypes.filter((clientType) => clientType.client_type !== null).map((clientType) => clientType.client_type))];
      case 'courts':
        return courts.filter((court) => court.courts !== null).map((court) => court.courts); // Change 'court.court' to 'court.courts'
      case 'actionStatus':
        return (actionStatuses || []).filter((status) => status.action_status !== null).map((status) => status.action_status);

      default:
        return [];
    }
  };


  const fetchData = async () => {
    try {
      const caseStateData = await supabase.from('case_options').select('id, case_state');
      const caseStageData = await supabase.from('case_options').select('id, case_stage');
      const caseTypeData = await supabase.from('case_options').select('id, case_type');
      const clientTypeData = await supabase.from('case_options').select('id, client_type');
      const courtsData = await supabase.from('case_options').select('id, courts'); // Fetch courts data
      const actionStatusData = await supabase.from('case_options').select('id, action_status');

      return {
        caseStateData: caseStateData.data,
        caseStageData: caseStageData.data,
        caseTypeData: caseTypeData.data,
        clientTypeData: clientTypeData.data,
        courtsData: courtsData.data, // Return courts data
        actionStatusData: actionStatusData.data,
      };
    } catch (error) {
      console.error('Error fetching data:', error.message);
      return {
        caseStateData: [],
        caseStageData: [],
        caseTypeData: [],
        clientTypeData: [],
        courtsData: [], // Return empty array for courts data in case of error
        actionStatusData: [],
      };
    }
  };


  const handleAddNewValueClick = () => {
    setIsNewValueModalOpen(true);
  };

  const handleNewValueCancel = () => {
    setIsNewValueModalOpen(false);
    setNewFieldValue('');
  };



  const handleInsertCancel = () => {
    setIsInserting(false);
  };
  const handleInsertClick = () => {
    // Reset the edit value and set the insert mode
    setEditValue('');
    setIsInserting(true);
    setIsModalOpen(true);
  };



  const handleFieldClick = (field) => {
    setSelectedField(field);
    setEditValue(getFieldValues(field)[0]);
    setIsEditing(true);
  };

  const handleEditClick = (value) => {
    setEditValue(value); // Set the value to edit
    setOriginalValue(value); // Set the original value for identification
    setIsEditing(true); // Set editing mode to true
    setIsModalOpen(true); // Open the modal
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setIsModalOpen(false);
  };

  const handleDeleteClick = async (value) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${value}"؟`)) {
      return;
    }

    try {
      setIsSaving(true);

      let deleteData = null;
      let updatedData = [];

      switch (selectedField) {
        case 'caseState':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('case_state', value);
          updatedData = caseStates.filter(state => state.case_state !== value);
          setCaseStates(updatedData);
          break;
        case 'caseStage':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('case_stage', value);
          updatedData = caseStages.filter(stage => stage.case_stage !== value);
          setCaseStages(updatedData);
          break;
        case 'caseType':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('case_type', value);
          updatedData = caseTypes.filter(type => type.case_type !== value);
          setCaseTypes(updatedData);
          break;
        case 'clientType':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('client_type', value);
          updatedData = clientTypes.filter(clientType => clientType.client_type !== value);
          setClientTypes(updatedData);
          break;
        case 'courts':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('courts', value);
          updatedData = courts.filter(court => court.courts !== value);
          setCourts(updatedData);
          break;
        case 'actionStatus':
          deleteData = await supabase
            .from('case_options')
            .delete()
            .eq('action_status', value);
          updatedData = actionStatuses.filter(status => status.action_status !== value);
          setActionStatuses(updatedData);
          break;
        default:
          break;
      }

      if (deleteData.error) {
        console.error('Error deleting data:', deleteData.error.message);
        alert('حدث خطأ أثناء حذف القيمة');
        return;
      }

    } catch (error) {
      console.error('Error:', error.message);
      alert('حدث خطأ أثناء حذف القيمة');
    } finally {
      setIsSaving(false);
    }
  };
  const handleEditSave = async () => {
    try {
      if (!editValue) {
        console.error('Please enter a value for editing');
        return;
      }

      setIsSaving(true);

      let updateData = null;
      let updatedData = [];

      switch (selectedField) {
        case 'caseState':
          updateData = await supabase
            .from('case_options')
            .update({ case_state: editValue })
            .eq('case_state', originalValue); // Use the original value to identify the record to update
          updatedData = caseStates.map(state => state.case_state === originalValue ? { ...state, case_state: editValue } : state);
          setCaseStates(updatedData);
          break;
        case 'caseStage':
          updateData = await supabase
            .from('case_options')
            .update({ case_stage: editValue })
            .eq('case_stage', originalValue); // Use the original value to identify the record to update
          updatedData = caseStages.map(stage => stage.case_stage === originalValue ? { ...stage, case_stage: editValue } : stage);
          setCaseStages(updatedData);
          break;
        case 'caseType':
          updateData = await supabase
            .from('case_options')
            .update({ case_type: editValue })
            .eq('case_type', originalValue); // Use the original value to identify the record to update
          updatedData = caseTypes.map(type => type.case_type === originalValue ? { ...type, case_type: editValue } : type);
          setCaseTypes(updatedData);
          break;
        case 'clientType':
          updateData = await supabase
            .from('case_options')
            .update({ client_type: editValue })
            .eq('client_type', originalValue); // Use the original value to identify the record to update
          updatedData = clientTypes.map(clientType => clientType.client_type === originalValue ? { ...clientType, client_type: editValue } : clientType);
          setClientTypes(updatedData);
          break;
        case 'courts':
          updateData = await supabase
            .from('case_options')
            .update({ courts: editValue })
            .eq('courts', originalValue); // Use the original value to identify the record to update
          updatedData = courts.map((court) => (court.courts === originalValue ? { ...court, courts: editValue } : court));
          setCourts(updatedData); // Update courts state
          break;
        case 'actionStatus':
          updateData = await supabase
            .from('case_options')
            .update({ action_status: editValue })
            .eq('action_status', originalValue);
          updatedData = actionStatuses.map(status => status.action_status === originalValue ? { ...status, action_status: editValue } : status);
          setActionStatuses(updatedData);
          break;
        default:
          break;
      }

      if (updateData.error) {
        console.error('Error updating data:', updateData.error.message);
        return;
      }

      setIsEditing(false); // Disable editing mode
      setIsModalOpen(false); // Close the modal

    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setIsSaving(false);
    }
  };


  const handleInsertCourt = () => {
    setEditValue('');
    setIsInserting(true);
    setIsModalOpen(true);
  };
  const handleInsertSave = async () => {
    try {
      // Use Arabic value as primary, fallback to English if Arabic is empty
      const valueToSave = systemValueArabic || systemValueEnglish;

      if (!valueToSave || !selectedFieldType) {
        console.error('Please enter a value and select a field for inserting');
        return;
      }

      setIsSaving(true);

      let insertData = null;

      switch (selectedFieldType) {
        case 'caseState':
          insertData = await supabase
            .from('case_options')
            .upsert([{ case_state: valueToSave }], { returning: 'minimal' });
          break;
        case 'caseStage':
          insertData = await supabase
            .from('case_options')
            .upsert([{ case_stage: valueToSave }], { returning: 'minimal' });
          break;
        case 'caseType':
          insertData = await supabase
            .from('case_options')
            .upsert([{ case_type: valueToSave }], { returning: 'minimal' });
          break;
        case 'clientType':
          insertData = await supabase
            .from('case_options')
            .upsert([{ client_type: valueToSave }], { returning: 'minimal' });
          break;
        case 'courts':
          insertData = await supabase
            .from('case_options')
            .upsert([{ courts: valueToSave }], { returning: 'minimal' });
          break;
        case 'actionStatus':
          insertData = await supabase
            .from('case_options')
            .upsert([{ action_status: valueToSave }], { returning: 'minimal' });
          break;
        // Add cases for other fields if needed
        default:
          break;
      }

      if (insertData.error) {
        console.error('Error inserting data:', insertData.error.message);
        return;
      }

      console.log('Data inserted successfully:', insertData);

      // Reset form fields
      setSystemValueArabic('');
      setSystemValueEnglish('');
      setGroupTitleEnglish('');
      setEditValue('');
      setIsInserting(false);
      setIsModalOpen(false);

      // Fetch the updated data and set it in the state
      const updatedData = await fetchData();

      switch (selectedFieldType) {
        case 'caseState':
          setCaseStates(updatedData.caseStateData);
          break;
        case 'caseStage':
          setCaseStages(updatedData.caseStageData);
          break;
        case 'caseType':
          setCaseTypes(updatedData.caseTypeData);
          break;
        case 'clientType':
          setClientTypes(updatedData.clientTypeData);
          break;
        case 'courts':
          setCourts(updatedData.courtsData);
          break;
        case 'actionStatus':
          setActionStatuses(updatedData.actionStatusData);
          break;
        // Update state for other fields if needed
        default:
          break;
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Layout>
      <div className="app-values-container">
        <div className="app-values-header">
          <h1 className="page-title">إعدادات القيم</h1>
          <p className="page-subtitle">قيم النظام الثابتة التي تستخدمها كافة أنواع العمليات والوظائف على النظام مثل أسماء المحاكم وحالة القضايا</p>
        </div>

        <div className="app-values-content">
          <div className="main-container">
            <div className="add-form-section">
              <div className="add-form-compact-row">
                <div className="add-form-header-compact">
                  <h2 className="add-form-title">قيمة جديدة</h2>
                  <p className="add-form-description">يمكنك إضافة قيمة جديدة إلى أي من المجموعات المحددة</p>
                </div>
                <form className="add-form-single-row" onSubmit={(e) => { e.preventDefault(); handleInsertSave(); }}>
                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      التصنيف <span className="required-asterisk">*</span>
                    </label>
                    <select
                      className="form-select-horizontal"
                      value={selectedFieldType}
                      onChange={(e) => setSelectedFieldType(e.target.value)}
                    >
                      <option value="caseState">حالة الدعوى</option>
                      <option value="caseStage">مرحلة الدعوى</option>
                      <option value="caseType">نوع الدعوى</option>
                      <option value="clientType">نوع الموكل</option>
                      <option value="courts">المحكمة</option>
                      <option value="actionStatus">حالة الإجراء</option>
                    </select>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>English</label>
                    <div className="input-with-icon">
                      <i className="fas fa-sync-alt input-icon"></i>
                      <input
                        type="text"
                        className="form-input-horizontal"
                        value={groupTitleEnglish}
                        onChange={(e) => setGroupTitleEnglish(e.target.value)}
                        placeholder=""
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      قيمة النظام <span className="required-asterisk">*</span>
                    </label>
                    <div className="input-with-icon">
                      <i className="fas fa-sync-alt input-icon"></i>
                      <input
                        type="text"
                        className="form-input-horizontal"
                        value={systemValueArabic}
                        onChange={(e) => setSystemValueArabic(e.target.value)}
                        placeholder="قيمة النظام الجديدة"
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>English</label>
                    <div className="input-with-icon">
                      <i className="fas fa-sync-alt input-icon"></i>
                      <input
                        type="text"
                        className="form-input-horizontal"
                        value={systemValueEnglish}
                        onChange={(e) => setSystemValueEnglish(e.target.value)}
                        placeholder=""
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="add-btn-horizontal"
                    disabled={!systemValueArabic || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>جاري الإضافة...</span>
                      </>
                    ) : (
                      <span>إضافة</span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="container-layout">
              <div className="side-menu">
                <h3 className="side-menu-title">التصنيف</h3>
                <div className="side-menu-list">
                  <div
                    onClick={() => handleFieldClick('caseState')}
                    className={`side-menu-item ${selectedField === 'caseState' ? 'active' : ''}`}>
                    <span className="side-menu-icon">📋</span>
                    <span className="side-menu-label">حالة الدعوى</span>
                    <span className="side-menu-count">{getFieldValues('caseState').length}</span>
                  </div>
                  <div
                    onClick={() => handleFieldClick('caseStage')}
                    className={`side-menu-item ${selectedField === 'caseStage' ? 'active' : ''}`}>
                    <span className="side-menu-icon">📊</span>
                    <span className="side-menu-label">مرحلة الدعوى</span>
                    <span className="side-menu-count">{getFieldValues('caseStage').length}</span>
                  </div>
                  <div
                    onClick={() => handleFieldClick('caseType')}
                    className={`side-menu-item ${selectedField === 'caseType' ? 'active' : ''}`}>
                    <span className="side-menu-icon">⚖️</span>
                    <span className="side-menu-label">نوع الدعوى</span>
                    <span className="side-menu-count">{getFieldValues('caseType').length}</span>
                  </div>
                  <div
                    onClick={() => handleFieldClick('clientType')}
                    className={`side-menu-item ${selectedField === 'clientType' ? 'active' : ''}`}>
                    <span className="side-menu-icon">👤</span>
                    <span className="side-menu-label">نوع الموكل</span>
                    <span className="side-menu-count">{getFieldValues('clientType').length}</span>
                  </div>
                  <div
                    onClick={() => handleFieldClick('courts')}
                    className={`side-menu-item ${selectedField === 'courts' ? 'active' : ''}`}>
                    <span className="side-menu-icon">🏛️</span>
                    <span className="side-menu-label">المحكمة</span>
                    <span className="side-menu-count">{getFieldValues('courts').length}</span>
                  </div>
                  <div
                    onClick={() => handleFieldClick('actionStatus')}
                    className={`side-menu-item ${selectedField === 'actionStatus' ? 'active' : ''}`}>
                    <span className="side-menu-icon">📋</span>
                    <span className="side-menu-label">حالة الإجراء</span>
                    <span className="side-menu-count">{getFieldValues('actionStatus').length}</span>
                  </div>
                </div>
              </div>

              <div className="content-main-area">
                {selectedField && (
                  <div className="values-list-card">
                    <div className="card-header">
                      <h2 className="card-title">
                        {selectedField === 'caseState' && 'حالة الدعوى'}
                        {selectedField === 'caseStage' && 'مرحلة الدعوى'}
                        {selectedField === 'caseType' && 'نوع الدعوى'}
                        {selectedField === 'clientType' && 'نوع الموكل'}
                        {selectedField === 'courts' && 'المحكمة'}
                        {selectedField === 'actionStatus' && 'حالة الإجراء'}
                      </h2>
                      <span className="card-count">{getFieldValues(selectedField).length} عنصر</span>
                    </div>
                    <div className="card-body">
                      {getFieldValues(selectedField).length > 0 ? (
                        <ul className="values-list">
                          {getFieldValues(selectedField).map((value, index) => (
                            value && (
                              <li key={index} className="value-item">
                                <span className="value-text">{value}</span>
                                <div className="value-actions">
                                  <button
                                    onClick={() => handleEditClick(value)}
                                    className="edit-btn"
                                    aria-label="تحرير"
                                  >
                                    <i className="fas fa-edit"></i>
                                    <span>تحرير</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(value)}
                                    className="delete-btn"
                                    aria-label="حذف"
                                    disabled={isSaving}
                                  >
                                    <i className="fas fa-trash"></i>
                                    <span>حذف</span>
                                  </button>
                                </div>
                              </li>
                            )
                          ))}
                        </ul>
                      ) : (
                        <div className="empty-state">
                          <div className="empty-icon">📝</div>
                          <p className="empty-text">لا توجد قيم متاحة</p>
                          <p className="empty-subtext">ابدأ بإضافة قيمة جديدة</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedField && (
                  <div className="empty-selection">
                    <div className="empty-icon-large">⚙️</div>
                    <h3>اختر فئة للبدء</h3>
                    <p>اختر إحدى الفئات من القائمة الجانبية لعرض القيم وإدارتها</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedField && isEditing && (
        <Modal
          isOpen={isModalOpen}
          onRequestClose={handleEditCancel}
          style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            content: {
              position: 'relative',
              inset: 'auto',
              border: 'none',
              borderRadius: '12px',
              padding: '0',
              maxWidth: '500px',
              width: '90%',
              backgroundColor: '#ffffff',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            },
          }}>
          <div className="modal-content-modern">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-edit"></i>
                تحرير القيمة
              </h3>
              <button
                className="modal-close-btn"
                onClick={handleEditCancel}
                disabled={isSaving}
                aria-label="إغلاق"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">القيمة الجديدة</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="form-input"
                  placeholder="أدخل القيمة الجديدة"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={handleEditCancel}
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button
                className="btn-save"
                onClick={handleEditSave}
                disabled={isSaving || !editValue}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    <span>حفظ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <style jsx>{`
      .app-values-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem 2rem;
        direction: rtl;
      }

      .app-values-header {
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.375rem 0;
      }

      .page-subtitle {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
        line-height: 1.5;
      }

      .app-values-content {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .main-container {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
        overflow: hidden;
      }

      .container-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        min-height: 600px;
      }

      .side-menu {
        background: #f9fafb;
        padding: 1.5rem;
        border-left: 1px solid #e5e7eb;
      }

      .content-main-area {
        padding: 1.5rem 2rem;
        border-right: 1px solid #e5e7eb;
      }

      .side-menu-title {
        font-size: 1rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 1.25rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .side-menu-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    
      .side-menu-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        background: transparent;
        border: none;
        border-radius: 0;
        cursor: pointer;
        margin-bottom: 0.25rem;
      }

      .side-menu-item.active {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border-radius: 6px;
        color: #ffffff;
      }

      .side-menu-item.active .side-menu-label,
      .side-menu-item.active .side-menu-count {
        color: #ffffff;
      }

      .side-menu-icon {
        font-size: 1.25rem;
      }
    
      .side-menu-label {
        flex: 1;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      .side-menu-count {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        background: #e5e7eb;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        min-width: 2rem;
        text-align: center;
      }
    
      .side-menu-item.active .side-menu-count {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .content-area {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      @media (max-width: 1024px) {
        .container-layout {
          grid-template-columns: 1fr;
        }
        
        .side-menu {
          position: relative;
          top: 0;
        }
      }

      @media (max-width: 768px) {
        .app-values-container {
          padding: 1rem;
          padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important;
        }
      }

      .content-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .add-form-section {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        background: #fafbfc;
      }

      .add-form-compact-row {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .add-form-header-compact {
        min-width: 200px;
        flex-shrink: 0;
      }

      .add-form-title {
        font-size: 1rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.25rem 0;
      }

      .add-form-description {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
      }

      .add-form-single-row {
        display: flex;
        align-items: flex-end;
        gap: 0.75rem;
        flex-wrap: wrap;
        flex: 1;
      }

      .form-field-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        min-width: 140px;
      }

      .form-field-label {
        font-size: 0.7rem;
        font-weight: 600;
        color: #374151;
        margin: 0;
      }

      .input-with-icon {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        right: 0.75rem;
        color: #9ca3af;
        font-size: 0.875rem;
        z-index: 1;
      }

      .form-select-horizontal,
      .form-input-horizontal {
        padding: 0.5rem 2.25rem 0.5rem 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        font-size: 0.8rem;
        color: #1f2937;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        width: 100%;
        height: 36px;
      }

      .form-select-horizontal:focus,
      .form-input-horizontal:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .add-btn-horizontal {
        padding: 0.5rem 1.5rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 6px;
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
        height: 36px;
      }

      .add-btn-horizontal:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 1024px) {
        .add-form-compact-row {
          flex-direction: column;
          align-items: stretch;
        }

        .add-form-header-compact {
          min-width: auto;
        }

        .add-form-single-row {
          flex-direction: column;
          align-items: stretch;
        }
        
        .form-field-group {
          min-width: auto;
        }
      }

      .values-list-card {
        background: transparent;
        border-radius: 0;
        box-shadow: none;
        overflow: visible;
        border: none;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 0;
        background: transparent;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 1rem;
      }

      .card-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
      }
    
      .card-count {
        font-size: 0.875rem;
        color: #3b82f6;
        background: #eff6ff;
        padding: 0.375rem 0.875rem;
        border-radius: 12px;
        font-weight: 600;
        border: 1px solid #dbeafe;
      }

      .card-body {
        padding: 0;
      }

      .values-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .value-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.125rem 1.25rem;
        margin-bottom: 0.75rem;
        background: #ffffff;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .value-text {
        font-size: 0.95rem;
        color: #1f2937;
        font-weight: 600;
      }

      .value-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .edit-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.125rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
      }

      .delete-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.125rem;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border: none;
        border-radius: 8px;
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
      }

      .delete-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .edit-btn i {
        font-size: 0.875rem;
      }

      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .empty-text {
      font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
      }

      .empty-subtext {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .empty-selection {
        text-align: center;
        padding: 4rem 2rem;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .empty-icon-large {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.4;
      }

      .empty-selection h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
      }

      .empty-selection p {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .add-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
    
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      .form-label i {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .form-input,
      .form-select {
        padding: 0.875rem 1.125rem;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 0.95rem;
        color: #1f2937;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
    
      .form-input:focus,
      .form-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .form-input::placeholder {
        color: #9ca3af;
      }

      .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem 1.75rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.5rem;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      }

      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .modal-content-modern {
        display: flex;
        flex-direction: column;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }
    
      .modal-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
      }

      .modal-title i {
        color: #3b82f6;
      }

      .modal-close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        color: #6b7280;
        cursor: pointer;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .btn-cancel {
        padding: 0.875rem 1.75rem;
        background: #ffffff;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        color: #6b7280;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .btn-save {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.75rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      }

      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `}</style>
    </Layout>
  );
};

export default withAuth(AppValues, ['can_view_setting'], true);