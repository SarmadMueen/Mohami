import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';

export default function LawyerTestDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    checkAuthorizationAndLoadCases();
  }, []);

  const checkAuthorizationAndLoadCases = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check if user is a lawyer created by a company manager
      const { data: metadata } = await supabase
        .from('user_metadata')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (!metadata || metadata.role !== 'محامي' || !metadata.created_by_manager_id) {
        router.push('/dashboard');
        return;
      }

      setUser(currentUser);
      setAuthorized(true);
      await loadCases(currentUser.id);
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/login');
    }
  };

  const loadCases = async (userId) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cases:', error);
    } else {
      setCases(data || []);
    }
  };

  const handleStatusUpdate = async (caseId, newStatus) => {
    const { error } = await supabase
      .from('cases')
      .update({ status: newStatus })
      .eq('id', caseId);

    if (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } else {
      await loadCases(user.id);
      if (selectedCase?.id === caseId) {
        setSelectedCase({ ...selectedCase, status: newStatus });
      }
    }
  };

  const handleAddNote = async (caseId, note) => {
    // This would add to a notes table - for now, update manager_notes
    const { error } = await supabase
      .from('cases')
      .update({ 
        manager_notes: selectedCase.manager_notes 
          ? `${selectedCase.manager_notes}\n\nLawyer Note (${new Date().toLocaleDateString()}): ${note}`
          : `Lawyer Note (${new Date().toLocaleDateString()}): ${note}`
      })
      .eq('id', caseId);

    if (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } else {
      await loadCases(user.id);
      const { data } = await supabase.from('cases').select('*').eq('id', caseId).single();
      if (data) setSelectedCase(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Lawyer Dashboard (Test) - Mohami Pro</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white text-center py-2 text-sm">
          ⚠️ TEST ENVIRONMENT - Lawyer Interface
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">My Cases</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Case List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Assigned Cases</h2>
              <div className="space-y-3">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => setSelectedCase(caseItem)}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedCase?.id === caseItem.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{caseItem.case_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        caseItem.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        caseItem.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        caseItem.status === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {caseItem.status || 'Open'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{caseItem.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      Created: {new Date(caseItem.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {cases.length === 0 && (
                  <p className="text-center text-gray-500">No cases assigned to you yet</p>
                )}
              </div>
            </div>

            {/* Case Details */}
            {selectedCase && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Case Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700">Case Title</h3>
                    <p className="text-gray-900">{selectedCase.case_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700">Description</h3>
                    <p className="text-gray-900">{selectedCase.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700">Status</h3>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleStatusUpdate(selectedCase.id, 'open')}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedCase.status === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                        }`}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase.id, 'in_progress')}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedCase.status === 'in_progress' ? 'bg-yellow-600 text-white' : 'bg-gray-200'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase.id, 'closed')}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedCase.status === 'closed' ? 'bg-green-600 text-white' : 'bg-gray-200'
                        }`}
                      >
                        Closed
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-700">Deadline</h3>
                    <p className="text-gray-900">
                      {selectedCase.deadline ? new Date(selectedCase.deadline).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>

                  {selectedCase.manager_notes && (
                    <div>
                      <h3 className="font-medium text-gray-700">Notes</h3>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedCase.manager_notes}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Add Progress Note</h3>
                    <textarea
                      id="note-input"
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      placeholder="Enter your progress update..."
                    />
                    <button
                      onClick={() => {
                        const noteInput = document.getElementById('note-input');
                        if (noteInput && noteInput.value.trim()) {
                          handleAddNote(selectedCase.id, noteInput.value);
                          noteInput.value = '';
                        }
                      }}
                      className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
