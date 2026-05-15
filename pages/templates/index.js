import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaRegFilePdf, FaRegFileWord, FaRegFileAlt } from 'react-icons/fa';
import {
    FiSearch,
    FiDownload,
    FiEye,
    FiGrid,
    FiList,
    FiChevronDown,
    FiFolder,
    FiEdit3,
    FiUpload,
    FiTrash2
} from 'react-icons/fi';
import withAuth from '../../lib/withAuth';
import mammoth from 'mammoth';
import Head from 'next/head';
import { useSubscription } from '../../context/SubscriptionContext';

const TemplateListPage = () => {
    const { isReadOnly, loading: subLoading } = useSubscription();
    const [templates, setTemplates] = useState([]);
    const [allTemplates, setAllTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'date'
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'my', 'admin'
    const [currentUserId, setCurrentUserId] = useState(null);
    const [deleteToast, setDeleteToast] = useState(null);
    const router = useRouter();

    const formatBytes = (bytes, decimals = 1) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'pdf') return <FaRegFilePdf className="file-icon pdf" />;
        if (ext === 'doc' || ext === 'docx') return <FaRegFileWord className="file-icon word" />;
        return <FaRegFileAlt className="file-icon generic" />;
    };

    const getFileTypeLabel = (fileName) => {
        const ext = fileName.split('.').pop().toUpperCase();
        return ext || 'FILE';
    };

    const addTemplateToDatabase = async ({ fileName, filePath }) => {
        const { data: templateExists } = await supabase
            .from('templates')
            .select('id')
            .eq('file_name', fileName);

        let finalContent = '';

        if (!templateExists || templateExists.length === 0) {
            const { data: file, error: fileError } = await supabase
                .storage
                .from('templates')
                .download(fileName);

            if (fileError) {
                console.error('Error downloading file content:', fileError.message);
                return { content: '' };
            }

            try {
                const arrayBuffer = await file.arrayBuffer();
                const { value } = await mammoth.convertToHtml({ arrayBuffer });
                finalContent = value || '';
            } catch (conversionError) {
                console.error('Error converting .docx content to HTML:', conversionError);
                finalContent = '';
            }

            const { error } = await supabase
                .from('templates')
                .insert([{
                    file_name: fileName,
                    file_path: filePath,
                    content: finalContent,
                    updated_at: new Date().toISOString()
                }]);

            if (error) {
                console.error('Error inserting template into database:', error.message);
            }
        }

        return { content: finalContent };
    };

    const deleteTemplateFromDatabase = async (fileName) => {
        await supabase
            .from('templates')
            .delete()
            .eq('file_name', fileName);
    };

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                // Get current user
                const session = supabase.auth.session();
                if (session) {
                    setCurrentUserId(session.user.id);
                }

                const { data: files, error: storageError } = await supabase
                    .storage
                    .from('templates')
                    .list('');

                if (storageError) throw storageError;

                // Filter out placeholder files and lawyer folders (lawyer-* are folders, not files)
                const filteredFiles = files.filter(file => 
                    file.name !== '.emptyFolderPlaceholder' && 
                    !file.name.startsWith('lawyer-')
                );

                const fileMetaMap = filteredFiles.reduce((acc, file) => {
                    acc[file.name] = file;
                    return acc;
                }, {});

                const { data: existingTemplates, error: dbError } = await supabase
                    .from('templates')
                    .select('*');

                if (dbError) throw dbError;

                // Separate admin templates (root bucket files) from lawyer-uploaded templates (in DB only)
                const adminTemplates = existingTemplates.filter(t => t.is_admin_uploaded !== false);
                const lawyerTemplates = existingTemplates.filter(t => t.is_admin_uploaded === false);

                const existingFileNames = adminTemplates.map(template => template.file_name);
                const bucketFileNames = filteredFiles.map(file => file.name);

                // Only clean up admin templates that are missing from storage
                for (const template of adminTemplates) {
                    if (!bucketFileNames.includes(template.file_name)) {
                        await deleteTemplateFromDatabase(template.file_name);
                    }
                }

                const newFiles = filteredFiles.filter(file => !existingFileNames.includes(file.name));
                const newTemplatesPromises = newFiles.map(async (file) => {
                    try {
                        const { data: { publicURL }, error: urlError } = supabase
                            .storage
                            .from('templates')
                            .getPublicUrl(file.name);

                        if (urlError) return null;

                        const fileUrl = publicURL || '';

                        const { content } = await addTemplateToDatabase({
                            fileName: file.name,
                            filePath: fileUrl,
                        });

                        return {
                            name: file.name,
                            displayName: (() => {
                                // Use original Arabic name from metadata, strip extension
                                const orig = file.metadata?.originalName;
                                if (orig) return orig.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
                                return file.name;
                            })(),
                            publicURL: fileUrl,
                            size: file.metadata?.size || 0,
                            updatedAt: file.updated_at,
                            description: 'قالب جديد جاهز للاستخدام',
                            rawContent: content,
                            userId: null,
                            isAdminUploaded: true,
                        };
                    } catch (error) {
                        return null;
                    }
                });

                const validNewTemplates = (await Promise.all(newTemplatesPromises)).filter(t => t !== null);

                // Map admin templates from DB (those that exist in bucket)
                const mappedAdminTemplates = adminTemplates.map(template => {
                    const match = template.content ? template.content.match(/<p>(.*?)<\/p>/) : null;
                    const firstLine = match ? match[1].replace(/<[^>]+>/g, '') : null;
                    const meta = fileMetaMap[template.file_name] || {};
                    // Priority: 1) display_title from DB (admin/AI set), 2) first content line, 3) originalName, 4) file_name
                    const rawTitle = template.display_title || firstLine || meta.metadata?.originalName?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || template.file_name;

                    return {
                        id: template.id,
                        name: template.file_name,
                        displayName: rawTitle.length > 50 ? rawTitle.substring(0, 50) + '...' : rawTitle,
                        fullTitle: rawTitle,
                        description: template.content ? template.content.replace(/<[^>]+>/g, ' ').substring(0, 80) + '...' : '',
                        publicURL: template.file_path,
                        size: meta.metadata?.size || 0,
                        updatedAt: meta.updated_at || template.updated_at,
                        rawContent: template.content,
                        userId: template.user_id,
                        isAdminUploaded: true,
                    };
                });

                // Map lawyer-uploaded templates from DB (no bucket check needed)
                const mappedLawyerTemplates = lawyerTemplates.map(template => {
                    const rawTitle = template.display_title || template.file_name.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

                    return {
                        id: template.id,
                        name: template.file_name,
                        displayName: rawTitle.length > 50 ? rawTitle.substring(0, 50) + '...' : rawTitle,
                        fullTitle: rawTitle,
                        description: template.content ? template.content.replace(/<[^>]+>/g, ' ').substring(0, 80) + '...' : '',
                        publicURL: template.file_path,
                        size: 0,
                        updatedAt: template.updated_at,
                        rawContent: template.content,
                        userId: template.user_id,
                        isAdminUploaded: false,
                    };
                });

                const combinedTemplates = [
                    ...mappedAdminTemplates.filter(t => bucketFileNames.includes(t.name)),
                    ...validNewTemplates,
                    ...mappedLawyerTemplates,
                ];

                combinedTemplates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                setAllTemplates(combinedTemplates);
                setTemplates(combinedTemplates);

            } catch (error) {
                console.error('Error fetching templates:', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    useEffect(() => {
        let filtered = allTemplates;

        // Apply filter tab
        if (filterTab === 'my' && currentUserId) {
            filtered = filtered.filter(template => template.userId === currentUserId);
        } else if (filterTab === 'admin') {
            filtered = filtered.filter(template => template.isAdminUploaded);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(template => {
                return template.displayName.toLowerCase().includes(query) ||
                    template.name.toLowerCase().includes(query);
            });
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'name') {
                return a.displayName.localeCompare(b.displayName, 'ar');
            } else if (sortBy === 'date') {
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            } else { // 'recent' - default
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
        });

        setTemplates(sorted);
    }, [searchQuery, allTemplates, sortBy, filterTab, currentUserId]);

    const handleCardClick = (templateName) => {
        router.push(`/templates/${encodeURIComponent(templateName)}`);
    };

    const showToast = (message, type = 'success') => {
        setDeleteToast({ message, type });
        setTimeout(() => setDeleteToast(null), 2500);
    };

    const handleDeleteTemplate = async (template) => {
        if (!currentUserId || template.userId !== currentUserId) return;

        showToast('جاري الحذف...', 'loading');

        try {
            // Delete from storage
            const { error: storageError } = await supabase
                .storage
                .from('templates')
                .remove([template.name]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('templates')
                .delete()
                .eq('file_name', template.name);

            if (dbError) throw dbError;

            showToast('تم حذف القالب بنجاح', 'success');
            
            // Remove deleted template from state without page reload
            setAllTemplates(prev => prev.filter(t => t.name !== template.name));
            setTemplates(prev => prev.filter(t => t.name !== template.name));
        } catch (error) {
            console.error('Delete error:', error);
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    return (
        <Layout>
            <Head>
                <title>مكتبة القوالب</title>
            </Head>
            <div className="templates-page" onClick={() => setSortDropdownOpen(false)}>
                {deleteToast && (
                    <div className={`delete-toast ${deleteToast.type}`}>
                        {deleteToast.type === 'loading' && <span className="toast-spinner" />}
                        {deleteToast.message}
                    </div>
                )}
                <div className="toolbar-container" onClick={(e) => e.stopPropagation()}>
                    <div className="search-section">
                        <div className="search-input-wrapper">
                            <FiSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="بحث عن القوالب..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            <button className="search-btn">بحث</button>
                        </div>
                    </div>

                    <div className="filter-tabs-section">
                        <button
                            className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterTab('all')}
                        >
                            جميع العرائض والطلبات
                        </button>
                        <button
                            className={`filter-tab ${filterTab === 'my' ? 'active' : ''}`}
                            onClick={() => setFilterTab('my')}
                        >
                            قوالب خاصة بي
                        </button>
                    </div>

                    <div className="actions-section">
                        <button
                            className="upload-template-btn"
                            onClick={() => router.push('/templates/upload')}
                            disabled={isReadOnly || subLoading}
                            style={{
                                opacity: isReadOnly || subLoading ? 0.5 : 1,
                                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FiUpload size={16} />
                            <span>رفع قالب</span>
                        </button>

                        <button
                            className="design-letterhead-btn"
                            onClick={() => router.push('/templates/design-letterhead')}
                            disabled={isReadOnly || subLoading}
                            style={{
                                opacity: isReadOnly || subLoading ? 0.5 : 1,
                                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FiEdit3 size={16} />
                            <span>تصميم قالب الطلب</span>
                        </button>

                        <div className="divider"></div>

                        <div className="filter-group">
                            <div className="sort-dropdown-wrapper">
                                <button
                                    className="filter-btn"
                                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                                >
                                    <span>ترتيب</span>
                                    <FiChevronDown style={{
                                        transform: sortDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease'
                                    }} />
                                </button>
                                {sortDropdownOpen && (
                                    <div className="sort-dropdown">
                                        <button
                                            className={`sort-option ${sortBy === 'recent' ? 'active' : ''}`}
                                            onClick={() => {
                                                setSortBy('recent');
                                                setSortDropdownOpen(false);
                                            }}
                                        >
                                            آخر تحديث
                                        </button>
                                        <button
                                            className={`sort-option ${sortBy === 'name' ? 'active' : ''}`}
                                            onClick={() => {
                                                setSortBy('name');
                                                setSortDropdownOpen(false);
                                            }}
                                        >
                                            حسب الاسم
                                        </button>
                                        <button
                                            className={`sort-option ${sortBy === 'date' ? 'active' : ''}`}
                                            onClick={() => {
                                                setSortBy('date');
                                                setSortDropdownOpen(false);
                                            }}
                                        >
                                            حسب التاريخ
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="divider"></div>

                        <div className="view-toggles">
                            <button
                                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <FiGrid />
                            </button>
                            <button
                                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <FiList />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="content-area">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>جاري تحميل القوالب...</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><FiFolder /></div>
                            <h3>لا توجد قوالب</h3>
                            <p>لم يتم العثور على أي قوالب.</p>
                        </div>
                    ) : (
                        <div className={`templates-grid ${viewMode}`}>
                            {templates.map((template) => (
                                <div key={template.name} className="template-card">
                                    <div
                                        className="card-preview"
                                        onClick={() => handleCardClick(template.name)}
                                    >
                                        <div className="preview-container">
                                            {template.rawContent ? (
                                                <div
                                                    className="preview-content-html"
                                                    dangerouslySetInnerHTML={{ __html: template.rawContent }}
                                                />
                                            ) : (
                                                <div className="preview-icon-wrapper">
                                                    {getFileIcon(template.name)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <div className="card-content" onClick={() => handleCardClick(template.name)}>
                                            <h3 className="card-title" title={template.fullTitle || template.displayName}>
                                                {template.displayName}
                                            </h3>
                                            {!template.isAdminUploaded && (
                                                <span className="ownership-badge">خاص بي</span>
                                            )}
                                        </div>
                                        {template.userId === currentUserId && (
                                            <div className="card-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/templates/edit/${template.id}`);
                                                    }}
                                                    title="تعديل القالب"
                                                >
                                                    <FiEdit3 size={14} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTemplate(template);
                                                    }}
                                                    title="حذف القالب"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <style jsx>{`
                    .delete-toast {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 9999;
                        padding: 16px 32px;
                        border-radius: 12px;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        font-size: 15px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
                        animation: toastIn 0.3s ease;
                        pointer-events: none;
                    }
                    .delete-toast.success {
                        background: #059669;
                        color: white;
                    }
                    .delete-toast.error {
                        background: #dc2626;
                        color: white;
                    }
                    .delete-toast.loading {
                        background: #1e293b;
                        color: white;
                    }
                    .toast-spinner {
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 0.6s linear infinite;
                    }
                    @keyframes toastIn {
                        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .templates-page {
                        padding: 24px;
                        background: transparent;
                        min-height: 100vh;
                        direction: rtl;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .toolbar-container {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 16px;
                        justify-content: space-between;
                        align-items: center;
                        background: #ffffff;
                        padding: 16px 24px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                        border: 1px solid #E2E8F0;
                        margin-bottom: 24px;
                        margin-top: 20px;
                    }

                    .filter-tabs-section {
                        display: flex;
                        gap: 8px;
                        padding: 4px;
                        background: #F1F5F9;
                        border-radius: 10px;
                        border: 1px solid #E2E8F0;
                    }

                    .filter-tab {
                        padding: 8px 16px;
                        border: none;
                        background: transparent;
                        color: #64748B;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
                        border-radius: 8px;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        min-width: fit-content;
                    }

                    .filter-tab:hover {
                        color: #334155;
                        background: rgba(255, 255, 255, 0.5);
                    }

                    .filter-tab.active {
                        background: #ffffff;
                        color: #2563EB;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                    }

                    .search-section {
                        flex: 1;
                        min-width: 280px;
                        max-width: 400px;
                    }

                    .search-input-wrapper {
                        position: relative;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        background: #F8FAFC;
                        border: 1.5px solid #E2E8F0;
                        border-radius: 12px;
                        padding: 4px;
                        transition: all 0.2s ease;
                    }

                    .search-input-wrapper:focus-within {
                        border-color: #2563EB;
                        background: #ffffff;
                        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    }

                    .search-icon {
                        margin-right: 12px;
                        color: #64748B;
                        font-size: 18px;
                        line-height: 1;
                    }

                    .search-input {
                        flex: 1;
                        padding: 8px 8px;
                        border: none;
                        background: transparent;
                        font-family: inherit;
                        font-size: 14px;
                        color: #1E293B;
                        line-height: 1.5;
                    }

                    .search-input:focus {
                        outline: none;
                    }

                    .search-btn {
                        padding: 8px 20px;
                        background: #2563EB;
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }

                    .search-btn:hover {
                        background: #1D4ED8;
                        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
                    }

                    .search-input::placeholder {
                        color: #94A3B8;
                    }

                    .actions-section {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        flex-wrap: wrap;
                    }

                    .design-letterhead-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 16px;
                        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
                    }

                    .design-letterhead-btn:hover {
                        background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
                        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
                        transform: translateY(-1px);
                    }

                    .upload-template-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 16px;
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
                    }

                    .upload-template-btn:hover {
                        background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                        box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
                        transform: translateY(-1px);
                    }

                    .filter-group {
                        display: flex;
                        gap: 8px;
                        position: relative;
                    }

                    .sort-dropdown-wrapper {
                        position: relative;
                    }

                    .filter-btn {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 14px;
                        border: 1.5px solid #E2E8F0;
                        background: #ffffff;
                        border-radius: 8px;
                        color: #475569;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }

                    .filter-btn:hover {
                        background: #F1F5F9;
                        border-color: #CBD5E1;
                        color: #334155;
                    }

                    .sort-dropdown {
                        position: absolute;
                        top: calc(100% + 8px);
                        right: 0;
                        background: #ffffff;
                        border: 1.5px solid #E2E8F0;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        min-width: 160px;
                        z-index: 1000;
                        overflow: hidden;
                    }

                    .sort-option {
                        display: block;
                        width: 100%;
                        padding: 10px 16px;
                        border: none;
                        background: transparent;
                        text-align: right;
                        color: #475569;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }

                    .sort-option:hover {
                        background: #F1F5F9;
                        color: #1E293B;
                    }

                    .sort-option.active {
                        background: #EFF6FF;
                        color: #2563EB;
                        font-weight: 600;
                    }

                    .divider {
                        width: 1px;
                        height: 24px;
                        background: #E2E8F0;
                    }

                    .view-toggles {
                        display: flex;
                        background: #F1F5F9;
                        padding: 3px;
                        border-radius: 8px;
                        border: 1px solid #E2E8F0;
                    }

                    .view-btn {
                        padding: 6px 10px;
                        border: none;
                        background: transparent;
                        border-radius: 6px;
                        cursor: pointer;
                        color: #64748B;
                        display: flex;
                        align-items: center;
                        transition: all 0.2s ease;
                    }

                    .view-btn.active {
                        background: #ffffff;
                        color: #2563EB;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                    }
                    
                    .download-history-btn {
                        background: transparent;
                        border: 1.5px solid #E2E8F0;
                        color: #64748B;
                        padding: 8px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 18px;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .download-history-btn:hover {
                        background: #F1F5F9;
                        border-color: #CBD5E1;
                        color: #334155;
                    }

                    .templates-grid {
                        display: grid;
                        gap: 20px;
                    }

                    .templates-grid.grid {
                        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    }

                    .templates-grid.list {
                        grid-template-columns: 1fr;
                    }

                    .template-card {
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        border: 1px solid #E2E8F0;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        transition: none !important;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                        cursor: pointer;
                    }

                    .template-card:hover {
                        background: #F8FAFC;
                        border-color: #CBD5E1;
                    }

                    .card-preview {
                        height: 160px;
                        background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                        cursor: pointer;
                        border-bottom: 1px solid #E2E8F0;
                        position: relative;
                        overflow: hidden;
                    }

                    .preview-container {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                        overflow: hidden;
                        background: #ffffff;
                        padding: 12px;
                    }

                    .preview-content-html {
                        width: 180%;
                        transform: scale(0.55);
                        transform-origin: top center;
                        background: #fff;
                        padding: 8px 16px;
                        font-size: 13px;
                        line-height: 1.5;
                        color: #334155;
                        pointer-events: none;
                        display: flex;
                        flex-direction: column;
                        text-align: justify;
                    }
                    
                    .preview-content-html :global(img) {
                        display: none;
                    }
                    .preview-content-html :global(table) {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: inherit;
                        margin-bottom: 0.5rem;
                    }
                    .preview-content-html :global(p) {
                         margin-bottom: 0.3rem;
                         text-align: justify;
                    }
                    .preview-content-html :global(h1), 
                    .preview-content-html :global(h2), 
                    .preview-content-html :global(h3) {
                         font-size: 1.1em;
                         margin-bottom: 0.3rem;
                         text-align: center;
                    }

                    .preview-icon-wrapper {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 48px;
                        background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
                    }

                    :global(.file-icon.pdf) { color: #EF4444; }
                    :global(.file-icon.word) { color: #2563EB; }
                    :global(.file-icon.generic) { color: #64748B; }

                    .card-body {
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        gap: 12px;
                    }

                    .card-content {
                        cursor: pointer;
                        flex: 1;
                    }

                    .card-title {
                        font-size: 14px;
                        font-weight: 700;
                        color: #1E293B;
                        margin: 0; 
                        line-height: 1.5;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        text-align: center;
                    }

                    .ownership-badge {
                        display: inline-block;
                        font-size: 10px;
                        font-weight: 600;
                        color: #10B981;
                        background: #ECFDF5;
                        padding: 2px 6px;
                        border-radius: 4px;
                        margin-top: 4px;
                    }

                    .card-actions {
                        display: flex;
                        gap: 8px;
                        margin-top: auto;
                        justify-content: center;
                        align-items: center;
                    }

                    .edit-btn {
                        background: #EFF6FF;
                        border: 1px solid #BFDBFE;
                        color: #2563EB;
                        padding: 6px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .edit-btn:hover {
                        background: #DBEAFE;
                        border-color: #93C5FD;
                    }

                    .delete-btn {
                        background: #FEF2F2;
                        border: 1px solid #FECACA;
                        color: #DC2626;
                        padding: 6px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .delete-btn:hover {
                        background: #FEE2E2;
                        border-color: #FCA5A5;
                    }

                    .download-btn {
                        display: flex;
                        flex: 1;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        background: #2563EB;
                        color: #ffffff;
                        padding: 10px 16px;
                        border: none;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-family: inherit;
                    }
                    
                    .download-btn:hover {
                         background: #1D4ED8;
                         box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
                    }

                    .content-area {
                        min-height: 400px;
                    }

                    .loading-state, .empty-state {
                        padding: 80px 24px;
                        text-align: center;
                        color: #64748B;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .empty-icon {
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 20px;
                        color: #94A3B8;
                        font-size: 36px;
                    }

                    .empty-state h3 {
                        font-size: 20px;
                        font-weight: 700;
                        color: #1E293B;
                        margin: 0 0 8px 0;
                    }

                    .empty-state p {
                        font-size: 14px;
                        color: #64748B;
                        margin: 0;
                    }
                    
                    .spinner {
                        width: 48px;
                        height: 48px;
                        border: 4px solid #E2E8F0;
                        border-top-color: #2563EB;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 16px;
                    }

                    .loading-state p {
                        font-size: 14px;
                        color: #64748B;
                        margin: 0;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .templates-grid.list .template-card {
                        flex-direction: row;
                        align-items: center;
                        padding: 8px 12px;
                        height: auto;
                    }

                    .templates-grid.list .template-card:hover {
                        transform: none;
                    }

                    .templates-grid.list .card-preview {
                        display: none;
                    }
                    
                    .templates-grid.list .preview-content-html {
                        display: none;
                    }
                    
                    .templates-grid.list .preview-container {
                         background: #F8FAFC;
                         padding: 8px;
                    }

                    .templates-grid.list .card-body {
                        padding: 0;
                        flex-direction: row;
                        align-items: center;
                        gap: 20px;
                        flex: 1;
                    }
                    
                    .templates-grid.list .card-title {
                        margin: 0;
                        font-size: 16px;
                        min-width: 200px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        text-align: center;
                    }
                    
                    .templates-grid.list .card-actions {
                        margin: 0;
                        margin-right: auto;
                        justify-content: flex-end;
                        min-width: 120px;
                    }
                    
                    .templates-grid.list .download-btn {
                        flex: initial;
                        width: auto;
                        padding: 10px 20px;
                    }

                    @media (max-width: 768px) {
                        .templates-page {
                            padding: 16px;
                        }

                        .toolbar-container {
                            padding: 12px 16px;
                            gap: 12px;
                        }

                        .filter-tabs-section {
                            flex-wrap: nowrap;
                            width: 100%;
                        }

                        .filter-tab {
                            padding: 6px 12px;
                            font-size: 15px;
                            white-space: nowrap;
                        }

                        .search-section {
                            min-width: 100%;
                            max-width: 100%;
                        }

                        .templates-grid.grid {
                            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                            gap: 16px;
                        }

                        .card-preview {
                            height: 140px;
                        }
                    }
                `}</style>
            </div>
        </Layout>
    );
};

export default withAuth(TemplateListPage, ['can_edit_template']);