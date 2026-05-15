import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/initSupabase';
import mammoth from 'mammoth';
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
    Sparkles,
    Type
} from 'lucide-react';

const AdminTemplates = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [templates, setTemplates] = useState([]);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Rename state
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [newTemplateName, setNewTemplateName] = useState('');

    // Title editing state
    const [editingTitle, setEditingTitle] = useState(null);
    const [newTitle, setNewTitle] = useState('');
    const [generatingTitle, setGeneratingTitle] = useState(null);

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
        await fetchTemplates();
        setLoading(false);
    };

    const fetchTemplates = async () => {
        try {
            // Fetch from storage
            const { data: files, error: storageError } = await supabase
                .storage
                .from('templates')
                .list('');

            if (storageError) throw storageError;

            // Fetch display_title from DB
            const { data: dbTemplates } = await supabase
                .from('templates')
                .select('file_name, display_title');

            const titleMap = {};
            if (dbTemplates) {
                dbTemplates.forEach(t => {
                    titleMap[t.file_name] = t.display_title;
                });
            }

            const filteredFiles = files
                .filter(file => file.name !== '.emptyFolderPlaceholder')
                .map(file => {
                    // Use original Arabic name from metadata if available
                    const originalName = file.metadata?.originalName || (() => {
                        try { return decodeURIComponent(file.name); }
                        catch { return file.name; }
                    })();

                    // Default title from Arabic filename (strip extension)
                    const defaultTitle = originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

                    return {
                        ...file,
                        displayName: originalName,
                        displayTitle: titleMap[file.name] || defaultTitle,
                        hasDbTitle: !!titleMap[file.name]
                    };
                });
            setTemplates(filteredFiles);

        } catch (error) {
            console.error('Error fetching templates:', error);
            alert('حدث خطأ أثناء تحميل القوالب');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin');
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const file of Array.from(files)) {
                try {
                    // Use ASCII-safe storage name
                    const fileExtension = file.name.split('.').pop();
                    const originalName = file.name;
                    const safeName = `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExtension}`;

                    // Default title from Arabic filename (strip extension)
                    const defaultTitle = originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

                    const { error: uploadError } = await supabase
                        .storage
                        .from('templates')
                        .upload(safeName, file, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: file.type,
                            metadata: { originalName: originalName }
                        });

                    if (uploadError) {
                        if (uploadError.message.includes('Duplicate')) {
                            console.warn(`Duplicate file: ${originalName}`);
                        } else {
                            throw uploadError;
                        }
                    } else {
                        // Convert docx content and save to DB with display_title
                        let finalContent = '';
                        if (fileExtension.toLowerCase() === 'docx') {
                            try {
                                const arrayBuffer = await file.arrayBuffer();
                                const { value } = await mammoth.convertToHtml({ arrayBuffer });
                                finalContent = value || '';
                            } catch (conversionError) {
                                console.error('Error converting .docx:', conversionError);
                            }
                        }

                        // Get public URL
                        const { data: { publicURL } } = supabase
                            .storage
                            .from('templates')
                            .getPublicUrl(safeName);

                        // Insert into DB with display_title
                        await supabase
                            .from('templates')
                            .insert([{
                                file_name: safeName,
                                file_path: publicURL || '',
                                content: finalContent,
                                display_title: defaultTitle,
                                updated_at: new Date().toISOString()
                            }]);

                        successCount++;
                    }
                } catch (innerError) {
                    console.error(`Error uploading ${file.name}:`, innerError);
                    failCount++;
                }
            }

            if (successCount > 0) {
                alert(`تم رفع ${successCount} قالب بنجاح${failCount > 0 ? `، وفشل رفع ${failCount}` : ''}`);
            } else if (failCount > 0) {
                alert(`فشل رفع ${failCount} ملفات.`);
            }

            fileInputRef.current.value = '';
            await fetchTemplates();
        } catch (error) {
            console.error('Bulk upload error:', error);
            alert('حدث خطأ أثناء عملية الرفع الجماعي');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (storageName, displayName) => {
        if (!window.confirm(`هل أنت متأكد من حذف القالب "${displayName}"?`)) {
            return;
        }

        try {
            const { error: storageError } = await supabase
                .storage
                .from('templates')
                .remove([storageName]);

            if (storageError) throw storageError;

            await supabase
                .from('templates')
                .delete()
                .eq('file_name', storageName);

            alert('تم حذف القالب بنجاح');
            await fetchTemplates();
        } catch (error) {
            console.error('Delete error:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const startRename = (template) => {
        setEditingTemplate(template.name);
        setNewTemplateName(template.displayName);
    };

    const cancelRename = () => {
        setEditingTemplate(null);
        setNewTemplateName('');
    };

    const submitRename = async (oldStorageName) => {
        const currentTemplate = templates.find(t => t.name === oldStorageName);
        const currentDisplayName = currentTemplate?.displayName || oldStorageName;

        if (!newTemplateName.trim() || newTemplateName === currentDisplayName) {
            cancelRename();
            return;
        }

        try {
            const { data: fileData, error: downloadError } = await supabase
                .storage
                .from('templates')
                .download(oldStorageName);

            if (downloadError) throw downloadError;

            const { error: deleteError } = await supabase
                .storage
                .from('templates')
                .remove([oldStorageName]);

            if (deleteError) throw deleteError;

            const fileExtension = newTemplateName.split('.').pop() || oldStorageName.split('.').pop();
            const newStorageName = `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExtension}`;

            const { error: uploadError } = await supabase
                .storage
                .from('templates')
                .upload(newStorageName, fileData, {
                    cacheControl: '3600',
                    upsert: false,
                    metadata: { originalName: newTemplateName }
                });

            if (uploadError) throw uploadError;

            await supabase
                .from('templates')
                .update({ file_name: newStorageName })
                .eq('file_name', oldStorageName);

            alert('تم تغيير الاسم بنجاح');
            setEditingTemplate(null);
            setNewTemplateName('');
            await fetchTemplates();
        } catch (error) {
            console.error('Rename error:', error);
            alert('حدث خطأ أثناء تغيير الاسم');
        }
    };

    // ── Title Management ──

    const startTitleEdit = (template) => {
        setEditingTitle(template.name);
        setNewTitle(template.displayTitle || '');
    };

    const cancelTitleEdit = () => {
        setEditingTitle(null);
        setNewTitle('');
    };

    const saveTitle = async (storageName) => {
        if (!newTitle.trim()) {
            cancelTitleEdit();
            return;
        }

        try {
            // Check if template exists in DB
            const { data: existing } = await supabase
                .from('templates')
                .select('id')
                .eq('file_name', storageName);

            if (existing && existing.length > 0) {
                await supabase
                    .from('templates')
                    .update({ display_title: newTitle.trim() })
                    .eq('file_name', storageName);
            } else {
                // Insert new DB record with title
                const { data: { publicURL } } = supabase
                    .storage
                    .from('templates')
                    .getPublicUrl(storageName);

                await supabase
                    .from('templates')
                    .insert([{
                        file_name: storageName,
                        file_path: publicURL || '',
                        content: '',
                        display_title: newTitle.trim(),
                        updated_at: new Date().toISOString()
                    }]);
            }

            setEditingTitle(null);
            setNewTitle('');
            await fetchTemplates();
        } catch (error) {
            console.error('Save title error:', error);
            alert('حدث خطأ أثناء حفظ العنوان');
        }
    };

    const generateAITitle = async (template) => {
        setGeneratingTitle(template.name);

        try {
            // Download the file
            const { data: fileData, error: downloadError } = await supabase
                .storage
                .from('templates')
                .download(template.name);

            if (downloadError) throw downloadError;

            // Convert to text
            let textContent = '';
            try {
                const arrayBuffer = await fileData.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer });
                textContent = value || '';
            } catch (conversionError) {
                console.error('Error converting docx to text:', conversionError);
                alert('لم يتمكن من قراءة محتوى الملف');
                return;
            }

            if (!textContent.trim()) {
                alert('الملف فارغ أو لا يحتوي على نص');
                return;
            }

            // Call our API route
            const response = await fetch('/api/generate-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textContent })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate title');
            }

            // Save the generated title to DB  
            const { data: existing } = await supabase
                .from('templates')
                .select('id')
                .eq('file_name', template.name);

            if (existing && existing.length > 0) {
                await supabase
                    .from('templates')
                    .update({ display_title: data.title })
                    .eq('file_name', template.name);
            } else {
                const { data: { publicURL } } = supabase
                    .storage
                    .from('templates')
                    .getPublicUrl(template.name);

                await supabase
                    .from('templates')
                    .insert([{
                        file_name: template.name,
                        file_path: publicURL || '',
                        content: '',
                        display_title: data.title,
                        updated_at: new Date().toISOString()
                    }]);
            }

            await fetchTemplates();
        } catch (error) {
            console.error('AI title generation error:', error);
            alert('حدث خطأ: ' + (error.message || 'فشل في توليد العنوان'));
        } finally {
            setGeneratingTitle(null);
        }
    };

    const formatBytes = (bytes, decimals = 1) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
                        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                        color: #94a3b8;
                        font-family: 'Cairo', sans-serif;
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
                <title>إدارة القوالب - لوحة تحكم المدير</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div className="admin-container" dir="rtl">
                <header className="admin-header">
                    <div className="header-content">
                        <div className="header-left">
                            <ShieldCheck size={32} />
                            <div>
                                <h1>إدارة القوالب</h1>
                                <p>رفع، حذف، وتعديل ملفات القوالب</p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <Link href="/admin">
                                <a className="back-btn">
                                    <ArrowRight size={18} />
                                    العودة للرئيسية
                                </a>
                            </Link>
                            <button className="logout-btn" onClick={handleLogout}>
                                <LogOut size={18} />
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>
                </header>

                <main className="admin-main">
                    <div className="toolbar-section">
                        <h2>ملفات القوالب ({templates.length})</h2>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            accept=".doc,.docx,.pdf"
                            multiple
                        />
                        <button
                            className="upload-btn"
                            onClick={handleUploadClick}
                            disabled={uploading}
                        >
                            {uploading ? <RefreshCw className="spin" size={20} /> : <Upload size={20} />}
                            {uploading ? 'جاري الرفع...' : 'رفع قالب جديد'}
                        </button>
                    </div>

                    <div className="data-table-container">
                        {templates.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} />
                                <h3>لا توجد قوالب</h3>
                                <p>قم برفع قوالب جديدة لتظهر للمستخدمين.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>اسم الملف</th>
                                            <th>العنوان</th>
                                            <th>حجم الملف</th>
                                            <th>تاريخ آخر تعديل</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templates.map(template => (
                                            <tr key={template.id || template.name}>
                                                {/* File Name Column */}
                                                <td>
                                                    {editingTemplate === template.name ? (
                                                        <div className="rename-input-wrapper">
                                                            <input
                                                                type="text"
                                                                className="rename-input"
                                                                value={newTemplateName}
                                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') submitRename(template.name);
                                                                    if (e.key === 'Escape') cancelRename();
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="file-name">
                                                            <FileText size={18} />
                                                            <span>{template.displayName}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Title Column */}
                                                <td>
                                                    {editingTitle === template.name ? (
                                                        <div className="title-edit-wrapper">
                                                            <input
                                                                type="text"
                                                                className="title-input"
                                                                value={newTitle}
                                                                onChange={(e) => setNewTitle(e.target.value)}
                                                                autoFocus
                                                                placeholder="أدخل العنوان..."
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveTitle(template.name);
                                                                    if (e.key === 'Escape') cancelTitleEdit();
                                                                }}
                                                            />
                                                            <div className="title-edit-actions">
                                                                <button
                                                                    className="mini-btn save"
                                                                    onClick={() => saveTitle(template.name)}
                                                                    title="حفظ"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button
                                                                    className="mini-btn cancel"
                                                                    onClick={cancelTitleEdit}
                                                                    title="إلغاء"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="title-display">
                                                            <span
                                                                className={`title-text ${!template.hasDbTitle ? 'auto-title' : ''}`}
                                                                onClick={() => startTitleEdit(template)}
                                                                title="انقر للتعديل"
                                                            >
                                                                {template.displayTitle || '—'}
                                                            </span>
                                                            <div className="title-actions">
                                                                <button
                                                                    className="mini-btn edit"
                                                                    onClick={() => startTitleEdit(template)}
                                                                    title="تعديل العنوان"
                                                                >
                                                                    <Type size={14} />
                                                                </button>
                                                                <button
                                                                    className={`mini-btn ai ${generatingTitle === template.name ? 'generating' : ''}`}
                                                                    onClick={() => generateAITitle(template)}
                                                                    disabled={generatingTitle === template.name}
                                                                    title="توليد عنوان بالذكاء الاصطناعي"
                                                                >
                                                                    {generatingTitle === template.name ? (
                                                                        <RefreshCw size={14} className="spin" />
                                                                    ) : (
                                                                        <Sparkles size={14} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                <td>{formatBytes(template.metadata?.size)}</td>
                                                <td>{new Date(template.updated_at).toLocaleDateString('ar-EG')}</td>
                                                <td>
                                                    {editingTemplate === template.name ? (
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn success"
                                                                onClick={() => submitRename(template.name)}
                                                                title="حفظ"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn cancel"
                                                                onClick={cancelRename}
                                                                title="إلغاء"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn rename"
                                                                onClick={() => startRename(template)}
                                                                title="تعديل اسم الملف"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDelete(template.name, template.displayName)}
                                                                title="حذف"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .header-left h1 {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0;
                }

                .header-left p {
                    margin: 4px 0 0;
                    opacity: 0.8;
                    font-size: 14px;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                .back-btn, .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: background 0.2s;
                    text-decoration: none;
                    font-size: 14px;
                }

                .back-btn:hover, .logout-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .admin-main {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 32px;
                }

                .toolbar-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .toolbar-section h2 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }

                .upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    font-family: inherit;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
                }

                .upload-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }

                .upload-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .data-table-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }

                .empty-state {
                    padding: 64px 24px;
                    text-align: center;
                    color: #64748b;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .empty-state h3 {
                    margin: 0;
                    font-size: 18px;
                    color: #0f172a;
                }

                .empty-state p {
                    margin: 0;
                    font-size: 14px;
                }

                .table-responsive {
                    overflow-x: auto;
                }

                .admin-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: right;
                }

                .admin-table th {
                    background: #f8fafc;
                    padding: 16px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #475569;
                    border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }

                .admin-table td {
                    padding: 14px 20px;
                    font-size: 14px;
                    color: #1e293b;
                    border-bottom: 1px solid #e2e8f0;
                    vertical-align: middle;
                }

                .admin-table tr:last-child td {
                    border-bottom: none;
                }
                
                .admin-table tbody tr:hover {
                    background: #f8fafc;
                }

                .file-name {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #0f172a;
                    font-weight: 500;
                    max-width: 250px;
                }
                
                .file-name span {
                    direction: ltr;
                    unicode-bidi: embed;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .rename-input-wrapper {
                    display: flex;
                    align-items: center;
                }

                .rename-input {
                    width: 100%;
                    max-width: 250px;
                    padding: 8px 12px;
                    border: 1px solid #2563eb;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: 14px;
                    direction: ltr;
                }

                .rename-input:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                /* ── Title Column Styles ── */

                .title-display {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 200px;
                }

                .title-text {
                    flex: 1;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.15s;
                    font-weight: 600;
                    color: #0f172a;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .title-text:hover {
                    background: #f1f5f9;
                }

                .title-text.auto-title {
                    color: #64748b;
                    font-style: italic;
                    font-weight: 400;
                }

                .title-actions {
                    display: flex;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .title-edit-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    min-width: 200px;
                }

                .title-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 2px solid #2563eb;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 13px;
                    direction: rtl;
                    background: #eff6ff;
                }

                .title-input:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
                }

                .title-edit-actions {
                    display: flex;
                    gap: 4px;
                }

                .mini-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }

                .mini-btn.edit {
                    color: #3b82f6;
                    background: #eff6ff;
                }

                .mini-btn.edit:hover {
                    background: #dbeafe;
                }

                .mini-btn.ai {
                    color: #8b5cf6;
                    background: #f5f3ff;
                }

                .mini-btn.ai:hover:not(:disabled) {
                    background: #ede9fe;
                    transform: scale(1.05);
                }

                .mini-btn.ai:disabled {
                    opacity: 0.7;
                    cursor: wait;
                }

                .mini-btn.ai.generating {
                    background: #ede9fe;
                    animation: pulse-ai 1.5s infinite;
                }

                @keyframes pulse-ai {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
                }

                .mini-btn.save {
                    color: #10b981;
                    background: #ecfdf5;
                }

                .mini-btn.save:hover {
                    background: #d1fae5;
                }

                .mini-btn.cancel {
                    color: #64748b;
                    background: #f1f5f9;
                }

                .mini-btn.cancel:hover {
                    background: #e2e8f0;
                }

                /* ── Action Buttons ── */

                .action-buttons {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: transparent;
                }

                .action-btn.rename {
                    color: #3b82f6;
                    background: #eff6ff;
                }

                .action-btn.rename:hover {
                    background: #dbeafe;
                }

                .action-btn.delete {
                    color: #ef4444;
                    background: #fef2f2;
                }

                .action-btn.delete:hover {
                    background: #fee2e2;
                }

                .action-btn.success {
                    color: #10b981;
                    background: #ecfdf5;
                }

                .action-btn.success:hover {
                    background: #d1fae5;
                }

                .action-btn.cancel {
                    color: #64748b;
                    background: #f1f5f9;
                }

                .action-btn.cancel:hover {
                    background: #e2e8f0;
                }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        gap: 16px;
                        text-align: center;
                    }

                    .header-left {
                        flex-direction: column;
                    }

                    .admin-main {
                        padding: 20px;
                    }
                    
                    .toolbar-section {
                        flex-direction: column;
                        gap: 16px;
                        align-items: stretch;
                    }
                }
            `}</style>
        </>
    );
};

export default AdminTemplates;
