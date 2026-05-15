import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [features, setFeatures] = useState({
    progress_tracking: true,
    activity_metrics: true,
    financial_info: false,
    client_info: true,
  });

  const TEST_EMAIL = 'dr.abd256@gmail.com';

  useEffect(() => {
    checkAuthorizationAndLoadPreferences();
  }, []);

  const checkAuthorizationAndLoadPreferences = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || currentUser.email !== TEST_EMAIL) {
        router.push('/company-manager-test');
        return;
      }

      await loadPreferences();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadPreferences = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('company_manager_preferences')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading preferences:', error);
    } else if (data && data.selected_features) {
      const featureMap = {
        progress_tracking: false,
        activity_metrics: false,
        financial_info: false,
        client_info: false,
      };
      data.selected_features.forEach(f => featureMap[f] = true);
      setFeatures(featureMap);
      setPreferences(data);
    }
  };

  const handleSave = async () => {
    const selectedFeatures = Object.keys(features).filter(key => features[key]);
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('company_manager_preferences')
      .upsert({
        user_id: currentUser.id,
        selected_features: selectedFeatures,
        default_view: 'dashboard',
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences');
    } else {
      alert('Preferences saved successfully');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings - Company Manager Test</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <div className="bg-red-600 text-white text-center py-2 text-sm">
          ⚠️ TEST ENVIRONMENT - Only for dr.abd256@gmail.com
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <button
              onClick={() => router.push('/company-manager-test')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h2 className="text-xl font-semibold mb-6">Customize Dashboard Features</h2>
            <p className="text-gray-600 mb-6">Select which features you want to see on your dashboard:</p>
            
            <div className="space-y-4">
              <label className="flex items-center p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={features.progress_tracking}
                  onChange={(e) => setFeatures({ ...features, progress_tracking: e.target.checked })}
                  className="mr-4 h-5 w-5"
                />
                <div>
                  <div className="font-semibold">Progress Tracking</div>
                  <div className="text-sm text-gray-600">Track case status, sessions, documents, and lawyer notes</div>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={features.activity_metrics}
                  onChange={(e) => setFeatures({ ...features, activity_metrics: e.target.checked })}
                  className="mr-4 h-5 w-5"
                />
                <div>
                  <div className="font-semibold">Lawyer Activity Metrics</div>
                  <div className="text-sm text-gray-600">Monitor lawyer performance, completion rates, and activity</div>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={features.financial_info}
                  onChange={(e) => setFeatures({ ...features, financial_info: e.target.checked })}
                  className="mr-4 h-5 w-5"
                />
                <div>
                  <div className="font-semibold">Financial Information</div>
                  <div className="text-sm text-gray-600">View payments, expenses, and financial reports</div>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={features.client_info}
                  onChange={(e) => setFeatures({ ...features, client_info: e.target.checked })}
                  className="mr-4 h-5 w-5"
                />
                <div>
                  <div className="font-semibold">Client Information</div>
                  <div className="text-sm text-gray-600">View and manage client details</div>
                </div>
              </label>
            </div>

            <button
              onClick={handleSave}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
