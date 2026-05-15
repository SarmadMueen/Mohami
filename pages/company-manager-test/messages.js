import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  MessageSquare,
  ArrowRight,
  RefreshCw,
  LogOut,
  Send,
  Users,
  AlertCircle
} from 'lucide-react';

export default function Messages() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState([]);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const TEST_EMAILS = ['dr.abd256@gmail.com', 'test.manager@example.com', 'tester@kk.com'];

  useEffect(() => {
    checkAuthorizationAndLoadData();
  }, []);

  const checkAuthorizationAndLoadData = async () => {
    try {
      const session = supabase.auth.session();
      
      if (!session || !session.user || !TEST_EMAILS.includes(session.user.email)) {
        router.push('/company-manager-test');
        return;
      }

      await loadLawyers();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadLawyers = async () => {
    const session = supabase.auth.session();
    
    const { data, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('created_by_manager_id', session.user.id)
      .eq('role', 'محامي');

    if (error) {
      console.error('Error loading lawyers:', error);
    } else {
      setLawyers(data || []);
    }
  };

  const loadMessages = async (lawyerId) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Note: This would need a dedicated messaging table for lawyer-manager communication
    // For now, we'll use a placeholder
    setMessages([
      {
        id: 1,
        sender: 'manager',
        text: 'Hello! How is the case progressing?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLawyer) return;

    // Note: This would need a dedicated messaging table
    // For now, we'll add a placeholder message
    const message = {
      id: messages.length + 1,
      sender: 'manager',
      text: newMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={32} />
        <p>جاري التحميل...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
            color: #666;
            font-family: 'Cairo', sans-serif;
          }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>الرسائل - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="dashboard-container" dir="rtl">
        {/* Warning Banner */}
        <div className="warning-banner">
          ⚠️ بيئة اختبار - مخصص فقط للتجربة
        </div>

        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <MessageSquare size={32} />
              <div>
                <h1>الرسائل</h1>
                <p>التواصل مع المحامين</p>
              </div>
            </div>
            <div className="header-right">
              <Link href="/company-manager-test">
                <a className="back-btn">
                  <ArrowRight size={18} /> العودة للوحة التحكم
                </a>
              </Link>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> خروج
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="chat-grid">
            {/* Lawyer List */}
            <div className="lawyer-list-panel">
              <h2 className="panel-title">المحامين</h2>
              <div className="lawyer-list">
                {lawyers.map((lawyer) => (
                  <div
                    key={lawyer.user_id}
                    onClick={() => {
                      setSelectedLawyer(lawyer);
                      loadMessages(lawyer.user_id);
                    }}
                    className={`lawyer-item ${selectedLawyer?.user_id === lawyer.user_id ? 'active' : ''}`}
                  >
                    <Users size={20} />
                    <div className="lawyer-info">
                      <h3>{lawyer.name}</h3>
                      <p>{lawyer.email}</p>
                    </div>
                  </div>
                ))}
                {lawyers.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={32} />
                    <p>لا يوجد محامين</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="chat-panel">
              {selectedLawyer ? (
                <>
                  <div className="chat-header">
                    <div className="chat-header-info">
                      <Users size={24} />
                      <div>
                        <h2>{selectedLawyer.name}</h2>
                        <p>{selectedLawyer.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message ${message.sender === 'manager' ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <p>{message.text}</p>
                          <p className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString('ar-IQ')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="empty-state">
                        <MessageSquare size={32} />
                        <p>لا توجد رسائل بعد</p>
                      </div>
                    )}
                  </div>

                  <div className="chat-input">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب رسالة..."
                    />
                    <button onClick={handleSendMessage}>
                      <Send size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-chat">
                  <MessageSquare size={48} />
                  <p>اختر محامياً للبدء في المراسلة</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <style jsx>{`
          .dashboard-container { min-height: 100vh; background: #f5f5f5; font-family: 'Cairo', sans-serif; }
          .warning-banner { background: #dc2626; color: white; text-align: center; padding: 12px; font-size: 14px; font-weight: 600; }
          .dashboard-header { background: white; color: #333; padding: 20px 40px; border-bottom: 1px solid #e5e5e5; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .header-left h1 { font-size: 20px; font-weight: 700; margin: 0; color: #333; }
          .header-left p { font-size: 14px; margin: 0; color: #666; }
          .header-right { display: flex; align-items: center; gap: 15px; }
          .back-btn { background: #2563eb; color: white; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }
          .back-btn:hover { background: #1d4ed8; }
          .logout-btn { background: #64748b; color: white; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .logout-btn:hover { background: #475569; }
          
          .dashboard-main { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
          
          .chat-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; height: calc(100vh - 250px); }
          @media (max-width: 1024px) {
            .chat-grid { grid-template-columns: 1fr; }
          }
          
          .lawyer-list-panel { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 20px; overflow-y: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .panel-title { font-size: 18px; font-weight: 700; color: #333; margin: 0 0 20px 0; }
          .lawyer-list { display: flex; flex-direction: column; gap: 10px; }
          .lawyer-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid #e5e5e5; }
          .lawyer-item:hover { border-color: #2563eb; background: #eff6ff; }
          .lawyer-item.active { border-color: #2563eb; background: #eff6ff; }
          .lawyer-info h3 { font-size: 14px; font-weight: 700; color: #333; margin: 0 0 4px 0; }
          .lawyer-info p { font-size: 12px; color: #666; margin: 0; }
          
          .chat-panel { background: white; border-radius: 12px; border: 1px solid #e5e5e5; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .chat-header { padding: 20px; border-bottom: 1px solid #e5e5e5; }
          .chat-header-info { display: flex; align-items: center; gap: 12px; }
          .chat-header-info h2 { font-size: 16px; font-weight: 700; color: #333; margin: 0; }
          .chat-header-info p { font-size: 13px; color: #666; margin: 4px 0 0 0; }
          
          .chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
          .message { display: flex; }
          .message.sent { justify-content: flex-end; }
          .message.received { justify-content: flex-start; }
          .message-content { max-width: 70%; padding: 12px 16px; border-radius: 12px; }
          .message.sent .message-content { background: #2563eb; color: white; }
          .message.received .message-content { background: #f5f5f5; color: #333; }
          .message-content p { margin: 0; line-height: 1.5; }
          .message-time { margin: 4px 0 0 0; font-size: 11px; opacity: 0.8; }
          
          .chat-input { padding: 20px; border-top: 1px solid #e5e5e5; display: flex; gap: 10px; }
          .chat-input input { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; }
          .chat-input input:focus { outline: none; border-color: #2563eb; }
          .chat-input button { background: #2563eb; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
          .chat-input button:hover { background: #1d4ed8; }
          
          .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #666; gap: 10px; }
          .empty-chat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; gap: 15px; }
        `}</style>
      </div>
    </>
  );
}
