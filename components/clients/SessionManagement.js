
/* eslint-disable react/prop-types */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';

const SessionManagement = ({ caseNumber }) => {
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    sessionName: '',
    sessionDate: '',
    sessionLocation: '',
    sessionNumber: '',
    sessionDetails: '',
    sessionTime: '',
  });

  useEffect(() => {
    // Fetch sessions data for the given case number and update the state
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('case_number', caseNumber);

        if (error) {
          console.error('Error fetching sessions:', error);
          return;
        }

        setSessions(data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, [caseNumber]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSession({ ...newSession, [name]: value });
  };

  const handleCreateSession = async () => {
    try {
      // Insert the new session into the 'sessions' table
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          {
            sessionname: newSession.sessionName,
            sessiondate: newSession.sessionDate,
            sessionlocation: newSession.sessionLocation,
            sessionnumber: newSession.sessionNumber,
            case_number: caseNumber,
            sessiondetails: newSession.sessionDetails,
            sessiontime: newSession.sessionTime,
          },
        ]);

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      // Update the sessions list with the new session
      setSessions([...sessions, data[0]]);
      
      // Clear the form fields
      setNewSession({
        sessionName: '',
        sessionDate: '',
        sessionLocation: '',
        sessionNumber: '',
        sessionDetails: '',
        sessionTime: '',
      });
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <div>
      <h3>إدارة الجلسات</h3>
      
      <div>
        {/* Create new session form */}
        <h4>إنشاء جلسة جديدة</h4>
        <form>
          <div className="form-group">
            <label>اسم الجلسة</label>
            <input
              type="text"
              name="sessionName"
              value={newSession.sessionName}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>تاريخ الجلسة</label>
            <input
              type="text"
              name="sessionDate"
              value={newSession.sessionDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>مكان الجلسة</label>
            <input
              type="text"
              name="sessionLocation"
              value={newSession.sessionLocation}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>رقم الجلسة</label>
            <input
              type="text"
              name="sessionNumber"
              value={newSession.sessionNumber}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>تفاصيل الجلسة</label>
            <input
              type="text"
              name="sessionDetails"
              value={newSession.sessionDetails}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>وقت الجلسة</label>
            <input
              type="text"
              name="sessionTime"
              value={newSession.sessionTime}
              onChange={handleInputChange}
            />
          </div>
          <button type="button" onClick={handleCreateSession}>إنشاء جلسة</button>
        </form>
      </div>

      <div>
        {/* List of sessions */}
        <h4>قائمة الجلسات</h4>
        <table>
          <thead>
            <tr>
              <th>اسم الجلسة</th>
              <th>تاريخ الجلسة</th>
              <th>مكان الجلسة</th>
              <th>رقم الجلسة</th>
              <th>تفاصيل الجلسة</th>
              <th>وقت الجلسة</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.sessionname}</td>
                <td>{session.sessiondate}</td>
                <td>{session.sessionlocation}</td>
                <td>{session.sessionnumber}</td>
                <td>{session.sessiondetails}</td>
                <td>{session.sessiontime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionManagement;
