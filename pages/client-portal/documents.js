import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import { FileText, Upload, Download, Eye, Trash2, AlertCircle } from 'lucide-react';

const DocumentsContent = () => {
  const { clientDataId, adminId, loading } = useClientPortal();
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!clientDataId) return;
    fetchDocs();
  }, [clientDataId]);

  const fetchDocs = async () => {
    setDocsLoading(true);
    const { data, error } = await supabase.from('client_shared_documents').select('*').eq('client_data_id', clientDataId).order('created_at', { ascending: false });
    if (!error) setDocs(data || []);
    setDocsLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `client-uploads/${clientDataId}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('images').upload(filePath, file);
      if (upErr) throw upErr;
      const { publicURL } = supabase.storage.from('images').getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from('client_shared_documents').insert([{
        client_data_id: clientDataId,
        admin_id: adminId,
        document_name: file.name,
        document_url: publicURL,
        document_type: 'uploaded_by_client',
        uploaded_by_client: true,
      }]);
      if (insertErr) throw insertErr;
      await fetchDocs();
    } catch (err) {
      console.error('Upload error:', err);
      alert('حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return '-'; } };

  const sharedByLawyer = docs.filter(d => !d.uploaded_by_client);
  const uploadedByMe = docs.filter(d => d.uploaded_by_client);

  if (loading || docsLoading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>جاري التحميل...</div>;

  return (
    <>
      <Head><title>المستندات - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-docs">
        <div className="page-header">
          <div><h1><FileText size={24} /> المستندات</h1><p>{docs.length} مستند</p></div>
          <button className="upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={18} />
            <span>{uploading ? 'جاري الرفع...' : 'رفع مستند'}</span>
          </button>
          <input ref={fileRef} type="file" hidden onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" />
        </div>

        {/* Shared by Lawyer */}
        <div className="docs-section">
          <h2>مستندات من المحامي ({sharedByLawyer.length})</h2>
          {sharedByLawyer.length === 0 ? (
            <div className="empty"><FileText size={24} /><p>لم تتم مشاركة أي مستندات بعد</p></div>
          ) : (
            <div className="docs-list">
              {sharedByLawyer.map(d => (
                <div key={d.id} className="doc-card">
                  <div className="doc-icon"><FileText size={20} /></div>
                  <div className="doc-info"><span className="doc-name">{d.document_name}</span><span className="doc-meta">{fmtDate(d.created_at)}{d.notes && ` • ${d.notes}`}</span></div>
                  {d.document_url && <a href={d.document_url} target="_blank" rel="noopener noreferrer" className="doc-action"><Download size={16} /></a>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded by Client */}
        <div className="docs-section">
          <h2>مستنداتي المرفوعة ({uploadedByMe.length})</h2>
          {uploadedByMe.length === 0 ? (
            <div className="empty"><Upload size={24} /><p>لم ترفع أي مستندات بعد</p></div>
          ) : (
            <div className="docs-list">
              {uploadedByMe.map(d => (
                <div key={d.id} className="doc-card uploaded">
                  <div className="doc-icon uploaded"><Upload size={20} /></div>
                  <div className="doc-info"><span className="doc-name">{d.document_name}</span><span className="doc-meta">{fmtDate(d.created_at)}</span></div>
                  {d.document_url && <a href={d.document_url} target="_blank" rel="noopener noreferrer" className="doc-action"><Eye size={16} /></a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .cp-docs { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .page-header h1 { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .page-header p { margin: 0; font-size: 14px; color: #64748b; }
        
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .page-header h1 {
            font-size: 20px;
          }
          .page-header p {
            font-size: 13px;
          }
        }
        .upload-btn { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #3B82F6, #1E3A8A); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; min-height: 44px; }
        .upload-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.3); }
        .upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        @media (max-width: 768px) {
          .upload-btn {
            width: 100%;
            justify-content: center;
            padding: 14px 20px;
            font-size: 15px;
          }
        }

        .docs-section { margin-bottom: 28px; }
        .docs-section h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 14px; }
        
        @media (max-width: 768px) {
          .docs-section h2 {
            font-size: 15px;
            margin-bottom: 12px;
          }
        }
        .empty { text-align: center; padding: 32px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
        .empty p { margin: 8px 0 0; font-size: 14px; }
        
        @media (max-width: 768px) {
          .empty {
            padding: 32px 20px;
            border-radius: 12px;
          }
          .empty p {
            font-size: 13px;
          }
        }

        .docs-list { display: flex; flex-direction: column; gap: 10px; }
        .doc-card { display: flex; align-items: center; gap: 14px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; transition: all 0.2s; position: relative; overflow: hidden; width: 100%; }
        .doc-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3px;
          height: 100%;
          border-radius: 0 12px 12px 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .doc-card:not(.uploaded)::before { background: linear-gradient(to bottom, #3B82F6, #1E3A8A); }
        .doc-card.uploaded::before { background: linear-gradient(to bottom, #059669, #047857); }
        .doc-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }
        .doc-card:hover::before {
          opacity: 1;
        }
        .doc-card:active {
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .docs-list {
            gap: 8px;
          }
          .doc-card {
            padding: 20px 16px;
            border-radius: 8px;
            width: 100%;
          }
        }
        .doc-icon { width: 40px; height: 40px; border-radius: 10px; background: #EFF6FF; color: #3B82F6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .doc-icon.uploaded { background: #ECFDF5; color: #10B981; }
        
        @media (max-width: 768px) {
          .doc-icon {
            width: 36px;
            height: 36px;
          }
        }
        .doc-info { flex: 1; min-width: 0; }
        .doc-name { display: block; font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-meta { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
        
        @media (max-width: 768px) {
          .doc-name {
            font-size: 13px;
          }
          .doc-meta {
            font-size: 11px;
          }
        }
        .doc-action { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; border-radius: 8px; transition: all 0.2s; flex-shrink: 0; text-decoration: none; }
        .doc-action:hover { background: #3B82F6; color: white; transform: scale(1.05); }
        
        @media (max-width: 768px) {
          .doc-action {
            width: 36px;
            height: 36px;
          }
        }

        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start; }
          .page-header h1 { font-size: 20px; }
          .upload-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </>
  );
};

const ClientDocumentsPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}><ClientLayout><DocumentsContent /></ClientLayout></ClientPortalProvider>
);
export default withClientAuth(ClientDocumentsPage);
