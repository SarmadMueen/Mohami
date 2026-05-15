import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/initSupabase';
import {
    ShieldCheck,
    LogOut,
    ArrowRight,
    FileText,
    Upload,
    Trash2,
    Edit2,
    RefreshCw,
    X,
    Check,
    Image as ImageIcon,
    FileType,
    Calendar,
    Hash,
    Plus,
    Save
} from 'lucide-react';

const AdminDecisions = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [decisions, setDecisions] = useState([]);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        decision_number: '',
        decision_date: '',
        category: 'جنائي',
        description: ''
    });
    const [imageFiles, setImageFiles] = useState([]);
    const [htmlFile, setHtmlFile] = useState(null);

    const imageInputRef = useRef(null);
    const htmlInputRef = useRef(null);

    useEffect(() => {
        checkAdminAuth();
    }, []);

    const checkAdminAuth = async () => {
        setLoading(true);
        const session = supabase.auth.session();
        if (!session) {
            router.push('/admin');
            return;
        }

        const { data: metadata, error } = await supabase
            .from('user_metadata')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error || !metadata || metadata.role !== 'super_admin') {
            router.push('/admin');
            return;
        }

        setAdminUser(metadata);
        setIsAuthorized(true);
        await fetchDecisions();
        setLoading(false);
    };

    const fetchDecisions = async () => {
        try {
            const { data, error } = await supabase
                .from('court_decisions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDecisions(data || []);
        } catch (error) {
            console.error('Error fetching decisions:', error);
            alert('حدث خطأ أثناء تحميل القرارات');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            setImageFiles(Array.from(e.target.files));
        }
    };

    const handleHtmlChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setHtmlFile(file);

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;

                // Extract plain text from HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                const plainText = tempDiv.innerText.replace(/\s+/g, ' ').trim();

                // 1. Extract Decision Number (e.g. 30/محرم/1444 or 1234/ت/2023)
                const numMatch = plainText.match(/رقم[:\s]+([\d\u0600-\u06FF\/]+)/);
                const decision_number = numMatch ? numMatch[1].trim() : '';

                // 2. Extract Date (e.g. 2022-08-28 or 28/8/2022)
                const dateMatch = plainText.match(/تاريخ[:\s]+(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/);
                let decision_date = '';
                if (dateMatch) {
                    const rawDate = dateMatch[1].replace(/\//g, '-');
                    const parts = rawDate.split('-');
                    if (parts[0].length === 4) { // yyyy-mm-dd
                        decision_date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    } else if (parts[2].length === 4) { // dd-mm-yyyy
                        decision_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }

                // 3. Extract Category
                const cats = ['جنائي', 'مدني', 'أحوال شخصية', 'عمل', 'تجاري', 'أحوال'];
                let category = formData.category;
                for (const cat of cats) {
                    if (plainText.includes(cat)) {
                        category = cat === 'أحوال' ? 'أحوال شخصية' : cat;
                        break;
                    }
                }

                // 4. Extract Description (Snippet)
                const markers = ['أصدرت القرار الآتي :-', 'القرار الآتي :-', 'القرار الآتي:', 'أصدرت المحكمة ما يلي:-'];
                let description = '';
                let foundMarker = false;
                for (const marker of markers) {
                    const idx = plainText.indexOf(marker);
                    if (idx !== -1) {
                        description = plainText.substring(idx + marker.length).trim();
                        foundMarker = true;
                        break;
                    }
                }
                if (!foundMarker) {
                    description = plainText;
                }

                // 5. Extract Title
                let title = '';
                // Assume title is something before "رقم" or "تاريخ" or the first line
                const lines = plainText.split('.');
                const firstSentence = lines[0].replace('جمهورية العراق', '').trim();
                title = firstSentence.length > 30 ? firstSentence.substring(0, 60).trim() : firstSentence;

                setFormData(prev => ({
                    ...prev,
                    title: title || prev.title,
                    decision_number: decision_number || prev.decision_number,
                    decision_date: decision_date || prev.decision_date,
                    category: category,
                    description: description || prev.description
                }));
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validation removed per request
        setUploading(true);
        try {
            const timestamp = Date.now();

            // Upload images (only if provided)
            const imageUrls = [];
            if (imageFiles && imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `decision_${timestamp}_img_${i}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('court-decisions')
                        .upload(`images/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('court-decisions').getPublicUrl(`images/${fileName}`);
                    imageUrls.push(data.publicURL);
                }
            }

            // Upload HTML (only if provided)
            let htmlUrl = '';
            if (htmlFile) {
                const htmlExt = htmlFile.name.split('.').pop();
                const htmlFileName = `decision_${timestamp}_doc.${htmlExt}`;
                const { error: htmlUploadError } = await supabase.storage
                    .from('court-decisions')
                    .upload(`docs/${htmlFileName}`, htmlFile);

                if (htmlUploadError) throw htmlUploadError;

                const { data: htmlData } = supabase.storage.from('court-decisions').getPublicUrl(`docs/${htmlFileName}`);
                htmlUrl = htmlData.publicURL;
            }

            // Save to DB
            const submissionData = {
                title: formData.title.trim() || 'بدون عنوان',
                decision_number: formData.decision_number.trim() || null,
                decision_date: formData.decision_date || null, // Convert empty string to null
                category: formData.category,
                description: formData.description.trim() || null,
                image_urls: imageUrls,
                html_url: htmlUrl,
                created_by: adminUser.user_id
            };

            const { error: dbError } = await supabase
                .from('court_decisions')
                .insert([submissionData]);

            if (dbError) throw dbError;

            alert('تم إضافة القرار بنجاح');
            setFormData({
                title: '',
                decision_number: '',
                decision_date: '',
                category: 'جنائي',
                description: ''
            });
            setImageFiles([]);
            setHtmlFile(null);
            if (imageInputRef.current) imageInputRef.current.value = '';
            if (htmlInputRef.current) htmlInputRef.current.value = '';

            await fetchDecisions();
        } catch (error) {
            console.error('Error adding decision:', error);
            alert(`حدث خطأ أثناء إضافة القرار: ${error.message || error}`);
        } finally {
            setUploading(false);
        }
    };

    const [reindexing, setReindexing] = useState(false);

    const handleReindexAll = async () => {
        if (!window.confirm('سيتم إعادة فهرسة جميع القرارات واستخراج النص الكامل من ملفات HTML. هل تريد المتابعة؟')) return;
        setReindexing(true);
        let updated = 0;
        let failed = 0;
        try {
            for (const decision of decisions) {
                if (!decision.html_url) { failed++; continue; }
                try {
                    const res = await fetch(decision.html_url);
                    const html = await res.text();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const plainText = tempDiv.innerText.replace(/\s+/g, ' ').trim();

                    // Extract full description from marker or use full text
                    const markers = ['أصدرت القرار الآتي :-', 'القرار الآتي :-', 'القرار الآتي:', 'أصدرت المحكمة ما يلي:-'];
                    let fullDesc = '';
                    for (const marker of markers) {
                        const idx = plainText.indexOf(marker);
                        if (idx !== -1) {
                            fullDesc = plainText.substring(idx + marker.length).trim();
                            break;
                        }
                    }
                    if (!fullDesc) fullDesc = plainText;

                    const { error } = await supabase
                        .from('court_decisions')
                        .update({ description: fullDesc })
                        .eq('id', decision.id);

                    if (error) { failed++; console.error(`Failed to update ${decision.id}:`, error); }
                    else { updated++; }
                } catch (e) {
                    failed++;
                    console.error(`Error re-indexing decision ${decision.id}:`, e);
                }
            }
            alert(`تم إعادة الفهرسة: ${updated} نجح، ${failed} فشل من أصل ${decisions.length}`);
            await fetchDecisions();
        } catch (err) {
            console.error('Re-index error:', err);
            alert('حدث خطأ أثناء إعادة الفهرسة');
        } finally {
            setReindexing(false);
        }
    };

    const handleDelete = async (decision) => {
        if (!window.confirm(`هل أنت متأكد من حذف القرار "${decision.title}"؟`)) {
            return;
        }

        try {
            // In a real app, you might want to also delete files from storage.
            // For now, simplify and delete from DB
            const { error } = await supabase
                .from('court_decisions')
                .delete()
                .eq('id', decision.id);

            if (error) throw error;

            alert('تم حذف القرار');
            await fetchDecisions();
        } catch (error) {
            console.error('Delete error:', error);
            alert('حدث خطأ أثناء الحذف');
        }
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
                    }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!isAuthorized) return null;

    return (
        <>
            <Head>
                <title>إدارة القرارات التمييزية - لوحة تحكم المدير</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div className="admin-container" dir="rtl">
                <header className="admin-header">
                    <div className="header-content">
                        <div className="header-left">
                            <ShieldCheck size={32} />
                            <div>
                                <h1>إدارة القرارات التمييزية</h1>
                                <p>رفع وإدارة قرارات محكمة التمييز</p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <Link href="/admin">
                                <a className="back-btn"><ArrowRight size={18} /> العودة</a>
                            </Link>
                            <button className="logout-btn" onClick={handleLogout}><LogOut size={18} /> خروج</button>
                        </div>
                    </div>
                </header>

                <main className="admin-main">
                    {/* Upload Form Section */}
                    <div className="form-section">
                        <h2>إضافة قرار جديد</h2>
                        <form onSubmit={handleSubmit} className="upload-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>عنوان القرار *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="مثال: قرار بخصوص عقار..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>رقم القرار</label>
                                    <input
                                        type="text"
                                        name="decision_number"
                                        value={formData.decision_number}
                                        onChange={handleInputChange}
                                        placeholder="مثال: 1234/ت/2023"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>التاريخ</label>
                                    <input
                                        type="date"
                                        name="decision_date"
                                        value={formData.decision_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>التصنيف</label>
                                    <select name="category" value={formData.category} onChange={handleInputChange}>
                                        <option value="جنائي">جنائي</option>
                                        <option value="مدني">مدني</option>
                                        <option value="أحوال شخصية">أحوال شخصية</option>
                                        <option value="عمل">عمل</option>
                                        <option value="تجاري">تجاري</option>
                                    </select>
                                </div>
                                <div className="form-group span-2">
                                    <label>وصف مختصر</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="2"
                                    />
                                </div>

                                <div className="file-upload-cards span-2">
                                    <div
                                        className={`file-card ${imageFiles.length > 0 ? 'file-selected' : ''}`}
                                        onClick={() => imageInputRef.current.click()}
                                    >
                                        <ImageIcon size={32} />
                                        <span>صور القرار (سكان)</span>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleImageChange}
                                            ref={imageInputRef}
                                            accept="image/*"
                                            hidden
                                        />
                                        <div className="card-action-text">
                                            {imageFiles.length > 0 ? `تم اختيار ${imageFiles.length} صور` : 'اختر الصور'}
                                        </div>
                                    </div>
                                    <div
                                        className={`file-card ${htmlFile ? 'file-selected' : ''}`}
                                        onClick={() => htmlInputRef.current.click()}
                                    >
                                        <FileType size={32} />
                                        <span>ملف الـ HTML</span>
                                        <input
                                            type="file"
                                            onChange={handleHtmlChange}
                                            ref={htmlInputRef}
                                            accept=".html"
                                            hidden
                                        />
                                        <div className="card-action-text">
                                            {htmlFile ? 'تم اختيار الملف' : 'اختر ملف HTML'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="submit-btn" disabled={uploading}>
                                {uploading ? <RefreshCw className="spin" size={20} /> : <Plus size={20} />}
                                {uploading ? 'جاري الرفع...' : 'حفظ القرار'}
                            </button>
                        </form>
                    </div>

                    {/* Listing Table Section */}
                    <div className="table-section">
                        <div className="table-header">
                            <h2>القرارات المرفوعة ({decisions.length})</h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={handleReindexAll} className="reindex-btn" disabled={reindexing}>
                                    {reindexing ? <RefreshCw className="spin" size={14} /> : <Save size={14} />}
                                    {reindexing ? 'جاري الفهرسة...' : 'إعادة فهرسة النصوص'}
                                </button>
                                <button onClick={fetchDecisions} className="refresh-btn"><RefreshCw size={16} /></button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="decisions-table">
                                <thead>
                                    <tr>
                                        <th>القرار</th>
                                        <th>الرقم</th>
                                        <th>التاريخ</th>
                                        <th>التصنيف</th>
                                        <th>الصور</th>
                                        <th>HTML</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {decisions.map(d => (
                                        <tr key={d.id}>
                                            <td><div className="decision-title">{d.title}</div></td>
                                            <td>{d.decision_number || '—'}</td>
                                            <td>{d.decision_date || '—'}</td>
                                            <td><span className="category-pill">{d.category}</span></td>
                                            <td>{d.image_urls?.length || 0}</td>
                                            <td>{d.html_url ? <Check size={16} color="green" /> : '—'}</td>
                                            <td>
                                                <div className="actions">
                                                    <button onClick={() => handleDelete(d)} className="delete-btn"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            <style jsx>{`
                .admin-container {
                    min-height: 100vh;
                    background: #f1f5f9;
                    font-family: 'Cairo', sans-serif;
                }
                .admin-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: white;
                    padding: 24px 32px;
                }
                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header-left { display: flex; align-items: center; gap: 16px; }
                .header-left h1 { font-size: 20px; font-weight: 700; margin: 0; }
                .header-left p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
                .header-actions { display: flex; gap: 12px; }
                .back-btn, .logout-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(255, 255, 255, 0.1); padding: 8px 16px;
                    border-radius: 8px; color: white; text-decoration: none; font-size: 14px;
                }
                .admin-main { max-width: 1200px; margin: 0 auto; padding: 32px; }
                
                .form-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .upload-form { margin-top: 20px; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-weight: 600; font-size: 14px; color: #475569; }
                .form-group input, .form-group select, .form-group textarea {
                    padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; outline: none;
                }
                .span-2 { grid-column: span 2; }
                .file-upload-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
                .file-card {
                    border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px;
                    display: flex; flex-direction: column; align-items: center; gap: 12px;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .file-card:hover {
                    border-color: #2563eb;
                    background: #f8fafc;
                    transform: translateY(-2px);
                }
                .file-selected { border-style: solid; border-color: #2563eb; background: #eff6ff !important; }
                .card-action-text {
                    background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 6px; 
                    font-size: 13px; font-weight: 600; color: #475569;
                }
                .file-selected .card-action-text { background: #2563eb; color: white; }
                .submit-btn {
                    margin-top: 24px; width: 100%; padding: 12px; background: #2563eb; color: white;
                    border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                }
                
                .reindex-btn {
                    display: flex; align-items: center; gap: 6px; padding: 6px 14px;
                    background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
                    border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;
                    font-family: 'Cairo', sans-serif; transition: all 0.2s;
                }
                .reindex-btn:hover { background: #dcfce7; }
                .reindex-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .table-section { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .table-container { overflow-x: auto; }
                .decisions-table { width: 100%; border-collapse: collapse; }
                .decisions-table th { background: #f8fafc; padding: 12px; text-align: right; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
                .decisions-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                .decision-title { font-weight: 600; color: #1e293b; }
                .category-pill { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 99px; font-size: 12px; }
                .actions { display: flex; gap: 8px; }
                .delete-btn { background: #fee2e2; color: #ef4444; border: none; padding: 6px; border-radius: 6px; cursor: pointer; }
                
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default AdminDecisions;
