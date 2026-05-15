import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import { MessageCircle, Send, Paperclip, Check, CheckCheck } from 'lucide-react';

const MessagesContent = () => {
  const { clientDataId, adminId, authUserId, clientInfo } = useClientPortal();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!clientDataId) return;
    fetchMessages();
    markAsRead();

    // Real-time subscription
    const sub = supabase
      .from(`client_messages:client_data_id=eq.${clientDataId}`)
      .on('INSERT', (payload) => {
        setMessages(prev => {
          // Deduplicate: skip if message already exists (from optimistic update)
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        if (payload.new.sender_type === 'lawyer') markAsRead();
      })
      .subscribe();

    return () => supabase.removeSubscription(sub);
  }, [clientDataId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_data_id', clientDataId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
    setLoading(false);
  };

  const markAsRead = async () => {
    await supabase
      .from('client_messages')
      .update({ is_read: true })
      .eq('client_data_id', clientDataId)
      .eq('sender_type', 'lawyer')
      .eq('is_read', false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    try {
      const { data, error } = await supabase.from('client_messages').insert([{
        client_data_id: clientDataId,
        admin_id: adminId,
        sender_type: 'client',
        sender_id: authUserId,
        message_text: messageText,
      }]).single();
      if (error) throw error;
      // Optimistic update: add sent message to state immediately
      if (data) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } else {
        // Fallback if no data returned: add a temporary message
        setMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          client_data_id: clientDataId,
          admin_id: adminId,
          sender_type: 'client',
          sender_id: authUserId,
          message_text: messageText,
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      }
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) return date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
      return date.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <>
      <Head><title>الرسائل - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-messages">
        <div className="chat-header">
          <MessageCircle size={22} />
          <div>
            <h1>المراسلات</h1>
            <p>تواصل مع المحامي</p>
          </div>
        </div>

        <div className="chat-body">
          {loading ? (
            <div className="chat-loading">جاري تحميل الرسائل...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <MessageCircle size={40} strokeWidth={1.5} />
              <p>لا توجد رسائل بعد</p>
              <span>ابدأ محادثة مع المحامي</span>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((m, i) => {
                const isClient = m.sender_type === 'client';
                const showDate = i === 0 || formatTime(messages[i - 1]?.created_at)?.split(' ')[0] !== formatTime(m.created_at)?.split(' ')[0];
                return (
                  <div key={m.id || i}>
                    <div className={`message-bubble ${isClient ? 'sent' : 'received'}`}>
                      <p className="message-text">{m.message_text}</p>
                      <div className="message-meta">
                        <span className="message-time">{formatTime(m.created_at)}</span>
                        {isClient && (
                          <span className="message-status">
                            {m.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className="chat-input" onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            disabled={sending}
          />
          <button type="submit" disabled={!newMessage.trim() || sending} className="send-btn">
            <Send size={20} />
          </button>
        </form>
      </div>

      <style jsx>{`
        .cp-messages { display: flex; flex-direction: column; height: calc(100vh - 72px - 60px); background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; animation: fadeIn 0.3s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        @media (max-width: 768px) {
          .cp-messages {
            height: calc(100vh - 60px - 60px - max(60px, calc(60px + env(safe-area-inset-bottom))));
            border-radius: 0;
            border: none;
          }
        }

        .chat-header { display: flex; align-items: center; gap: 12px; padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; flex-shrink: 0; }
        .chat-header h1 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
        .chat-header p { font-size: 13px; color: #64748b; margin: 0; }
        
        @media (max-width: 768px) {
          .chat-header {
            padding: 16px 20px;
          }
          .chat-header h1 {
            font-size: 16px;
          }
          .chat-header p {
            font-size: 12px;
          }
        }

        .chat-body { flex: 1; overflow-y: auto; padding: 20px 24px; background: #f8fafc; }
        .chat-loading { text-align: center; padding: 40px; color: #94a3b8; }
        .chat-empty { text-align: center; padding: 60px 20px; color: #94a3b8; }
        .chat-empty p { font-size: 16px; margin: 12px 0 0; }
        .chat-empty span { font-size: 13px; }
        
        @media (max-width: 768px) {
          .chat-body {
            padding: 16px 20px;
          }
          .chat-empty {
            padding: 48px 16px;
          }
          .chat-empty p {
            font-size: 15px;
          }
          .chat-empty span {
            font-size: 12px;
          }
        }

        .messages-container { display: flex; flex-direction: column; gap: 8px; }

        .message-bubble { max-width: 70%; width: fit-content; padding: 12px 18px; border-radius: 12px; position: relative; word-break: break-word; }
        .message-bubble.sent { background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; margin-left: auto; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
        .message-bubble.received { background: white; color: #1e293b; border: 1px solid #e2e8f0; margin-right: auto; border-bottom-right-radius: 4px; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
        
        @media (max-width: 768px) {
          .message-bubble {
            max-width: 88%;
            padding: 12px 16px;
          }
        }

        .message-text { margin: 0; font-size: 14px; line-height: 1.6; }
        .message-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 6px; }
        .message-time { font-size: 10px; opacity: 0.7; }
        .message-status { display: flex; align-items: center; opacity: 0.7; }
        
        @media (max-width: 768px) {
          .message-text {
            font-size: 15px;
          }
          .message-time {
            font-size: 11px;
          }
        }

        .chat-input { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: white; flex-shrink: 0; }
        .chat-input input { flex: 1; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.2s; min-height: 48px; }
        .chat-input input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .chat-input input::placeholder { color: #94a3b8; }
        .send-btn { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3B82F6, #1E3A8A); color: white; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        @media (max-width: 768px) {
          .chat-input {
            padding: 12px 16px;
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }
          .chat-input input {
            padding: 12px 14px;
            font-size: 16px; /* Prevent iOS zoom */
          }
          .send-btn {
            width: 44px;
            height: 44px;
          }
        }

        @media (max-width: 768px) {
          .cp-messages { height: calc(100vh - 136px); border-radius: 0; border: none; }
          .message-bubble { max-width: 88%; }
          .chat-input { padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
          .chat-input input { font-size: 16px; }
          .send-btn { width: 44px; height: 44px; }
        }
      `}</style>
    </>
  );
};

const ClientMessagesPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}><ClientLayout><MessagesContent /></ClientLayout></ClientPortalProvider>
);
export default withClientAuth(ClientMessagesPage);
