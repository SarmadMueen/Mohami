import re

with open('pages/cases/CaseDetailsPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'            \{\/\* Sidebar \*\/}.*?<div className=\"popup-main refined-popup-main\">'
new_content = re.sub(pattern, '<div className=\"popup-main refined-popup-main\">', content, flags=re.DOTALL)

target_insert = '''                <div
                  className="reminder-button-container"
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    width: "100%",
                    position: "relative",
                    zIndex: 10,
                  }}
                >'''

injection = '''
                {/* Section: الجلسة القادمة */}
                <div className="next-session-container" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                  <h3
                    className="next-session-main-title"
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: "700", color: "#1f2937", marginBottom: "16px", cursor: "default"
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>📅</span>
                    <span>الجلسة القادمة</span>
                  </h3>
                  <div className="next-session-content open">
                     <div className="session-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div className="reminder-form-group" style={{ marginBottom: 0, gap: "4px" }}>
                          <label htmlFor="next_session_date">تاريخ الجلسة</label>
                          <input type="date" id="next_session_date" name="next_session_date" value={popupSessionData.next_session_date || ''} onChange={handleSessionDataChange} className="reminder-form-input reminder-date-input" onClick={(e) => e.target.showPicker?.()} />
                        </div>
                        <div className="reminder-form-group" style={{ marginBottom: 0, gap: "4px" }}>
                          <label htmlFor="next_session_time">وقت الجلسة</label>
                          <select id="next_session_time" name="next_session_time" value={popupSessionData.next_session_time || ''} onChange={handleSessionDataChange} className="reminder-form-input reminder-form-select">
                            <option value="">--:--</option>
                            {timeOptions.map((option, index) => ( <option key={index} value={option.value}>{option.label}</option> ))}
                          </select>
                        </div>
                     </div>
                     <div className="reminder-form-group" style={{ marginBottom: "12px" }}>
                       <label htmlFor="next_session_req">طلبات الجلسة القادمة</label>
                       <textarea id="next_session_req" name="next_session_req" value={popupSessionData.next_session_req || ''} onChange={handleSessionDataChange} className="reminder-form-textarea" rows="2" placeholder="أدخل طلبات الجلسة القادمة" />
                     </div>
                  </div>
                </div>

                {/* Section: إضافة تذكير */}
                <div className="next-session-container" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginBottom: '20px' }}>
                  <h3
                    className="next-session-main-title"
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: "700", color: "#1f2937", marginBottom: "16px", cursor: "default"
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>🔔</span>
                    <span>إضافة تذكير</span>
                  </h3>
                  <div className="next-session-content open">
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div className="session-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div className="reminder-form-group" style={{ marginBottom: 0, gap: "4px" }}>
                          <label htmlFor="reminderTitle">عنوان التذكير</label>
                          <input type="text" id="reminderTitle" name="reminderTitle" className="reminder-form-input" value={remindervars.reminderTitle || ''} onChange={handleReminderDataChange} placeholder="أدخل عنوان التذكير" />
                        </div>
                        <div className="reminder-form-group" style={{ marginBottom: 0, gap: "4px" }}>
                          <label htmlFor="reminderDate">تاريخ التذكير</label>
                          <input type="date" id="reminderDate" name="reminderDate" className="reminder-form-input reminder-date-input" value={remindervars.reminderDate || ''} onChange={handleReminderDataChange} onClick={(e) => e.target.showPicker?.()} />
                        </div>
                      </div>
                      <div className="reminder-form-group" style={{ marginBottom: "12px" }}>
                        <label htmlFor="reminderNote">ملاحظة التذكير</label>
                        <textarea id="reminderNote" name="reminderNote" className="reminder-form-textarea" value={remindervars.reminderNote || ''} onChange={handleReminderDataChange} rows="2" placeholder="أدخل ملاحظة التذكير" />
                      </div>
                      <div className="reminder-form-group" style={{ marginBottom: "12px" }}>
                        <label htmlFor="lawyerDropdown">تذكير مستخدم آخر</label>
                        <select id="lawyerDropdown" name="lawyerDropdown" className="reminder-form-input reminder-form-select" value={selectedLawyer} onChange={(e) => setSelectedLawyer(e.target.value)}>
                          <option value="">اختر مستخدم</option>
                          {lawyerNames.map((name, index) => ( <option key={index} value={name}>{name}</option> ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
'''
if target_insert in new_content:
    new_content = new_content.replace(target_insert, injection + target_insert)
    with open('pages/cases/CaseDetailsPage.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully modified')
else:
    print('Signature not found!')
