import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import {
    ArrowRight,
    Printer,
    ZoomIn,
    ZoomOut,
    ChevronRight,
    ChevronLeft,
    FileText,
    Image as ImageIcon,
    Layout as LayoutIcon,
    RefreshCw
} from 'lucide-react';

const DecisionDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const [decision, setDecision] = useState(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [viewMode, setViewMode] = useState('side-by-side');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [htmlDoc, setHtmlDoc] = useState('');

    useEffect(() => {
        if (id) {
            fetchDecision();
        }
    }, [id]);

    const fetchDecision = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('court_decisions')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setDecision(data);

            // Fetch HTML content so we can use srcdoc (avoids content-type issues)
            if (data.html_url) {
                try {
                    const res = await fetch(data.html_url);
                    let text = await res.text();

                    // Remove distracting headers sometimes present in the raw files
                    text = text.replace(/نسخة السكان\s*\(الأصلية\)/g, '');
                    text = text.replace(/النسخة المطبوعة\s*\(A4\)/g, '');


                    // Inject CSS for a beautiful, professional legal document look
                    const cleanCSS = `
                    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        *, *::before, *::after {
                            border: none !important;
                            box-shadow: none !important;
                            outline: none !important;
                        }
                        html {
                            background: transparent !important;
                        }
                        body {
                            background: white !important;
                            margin: 0 auto !important;
                            max-width: 850px !important;
                            padding: 40px 50px 40px 50px !important;
                            font-family: 'Amiri', 'Traditional Arabic', serif !important;
                            font-size: 16px !important;
                            line-height: 2 !important;
                            color: #1e293b !important;
                            text-align: justify !important;
                            direction: rtl !important;
                            border-radius: 4px !important;
                            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important;
                            display: block !important;
                        }
                        .a4-page {
                            width: auto !important;
                            min-height: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            background: transparent !important;
                        }
                        @media print {
                            body {
                                max-width: none !important;
                                padding: 0 !important;
                                box-shadow: none !important;
                                background: white !important;
                            }
                            .a4-page {
                                padding: 0 !important;
                                margin: 0 !important;
                                max-width: none !important;
                            }
                        }
                        table, tr, td, th, div, p, span, section, article, header, footer {
                            background: transparent !important;
                            background-color: transparent !important;
                            overflow: visible !important;
                        }
                        body > div, body > table, body > section {
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        p, div, td, th, li, span, b, strong, i, em, a, h1, h2, h3, h4, h5, h6 {
                            font-family: inherit !important;
                            font-size: inherit !important;
                            max-width: 100% !important;
                            word-wrap: break-word !important;
                            overflow-wrap: break-word !important;
                        }
                        h1, h2, h3, h4, h5, h6 {
                            font-weight: 700 !important;
                            color: #0f172a !important;
                            text-align: center !important;
                            margin-top: 1.5em !important;
                            margin-bottom: 0.8em !important;
                        }
                        h1 { font-size: 22px !important; }
                        h2 { font-size: 20px !important; }
                        h3, h4, h5, h6 { font-size: 18px !important; }
                        img { max-width: 100% !important; height: auto !important; }
                        table {
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: collapse !important;
                            margin: 24px 0 !important;
                        }
                        td, th {
                            padding: 8px !important;
                            vertical-align: top !important;
                        }
                    </style>`;

                    const cleanerScript = `
                    <script>
                        document.addEventListener("DOMContentLoaded", function() {
                            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                            const nodesToRemove = [];
                            let node;
                            while (node = walker.nextNode()) {
                                if (node.nodeValue && node.nodeValue.includes("جمهورية العراق")) {
                                    node.nodeValue = node.nodeValue.replace(/جمهورية العراق/g, '');
                                    // If empty after, mark parent paragraph for death if empty
                                    nodesToRemove.push(node);
                                }
                            }
                            nodesToRemove.forEach(n => {
                                const parent = n.parentElement;
                                if (parent && parent.tagName === 'P' && parent.textContent.trim() === '') {
                                    parent.remove();
                                }
                            });
                        });
                    </script>`;

                    // Insert before </head> or at start of doc
                    if (text.includes('</head>')) {
                        text = text.replace('</head>', cleanCSS + '</head>');
                    } else {
                        text = cleanCSS + text;
                    }

                    if (text.includes('</body>')) {
                        text = text.replace('</body>', cleanerScript + '</body>');
                    } else {
                        text = text + cleanerScript;
                    }

                    setHtmlDoc(text);
                } catch (e) {
                    console.error('Error fetching HTML:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching decision detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const iframe = document.querySelector('.html-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        } else {
            window.print();
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading-container">
                    <RefreshCw className="spin" size={48} />
                    <p>جاري تحميل القرار...</p>
                </div>
                <style jsx>{`
                    .loading-container { min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </Layout>
        );
    }

    if (!decision) return <Layout><div>القرار غير موجود</div></Layout>;

    return (
        <Layout>
            <Head>
                <title>{decision.title} - قرار تمييزي</title>
            </Head>

            <div className="detail-page" dir="rtl">
                {/* Top Action Bar */}
                <div className="action-bar no-print">
                    <div className="action-left">
                        <button onClick={() => router.push('/decisions')} className="action-btn-back">
                            <ArrowRight size={20} />
                            <span>العودة للمكتبة</span>
                        </button>
                        <div className="divider" />
                        <h1 className="top-title">{decision.title?.replace(/جمهورية العراق/g, '').trim()}</h1>
                    </div>
                    <div className="action-right">
                        <div className="view-selector">
                            <button
                                className={viewMode === 'side-by-side' ? 'active' : ''}
                                onClick={() => setViewMode('side-by-side')}
                                title="عرض جانبي"
                            >
                                <LayoutIcon size={18} />
                            </button>
                            <button
                                className={viewMode === 'image-only' ? 'active' : ''}
                                onClick={() => setViewMode('image-only')}
                                title="عرض القرار"
                            >
                                <ImageIcon size={18} />
                            </button>
                            <button
                                className={viewMode === 'html-only' ? 'active' : ''}
                                onClick={() => setViewMode('html-only')}
                                title="عرض محتوى HTML"
                            >
                                <FileText size={18} />
                            </button>
                        </div>
                        <div className="divider" />
                        <div className="zoom-controls">
                            <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}><ZoomOut size={18} /></button>
                            <span>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}><ZoomIn size={18} /></button>
                        </div>
                        <div className="divider" />
                        <button onClick={handlePrint} className="print-btn">
                            <Printer size={18} />
                            <span>طباعة</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className={`viewer-container mode-${viewMode}`}>
                    {/* Left Side: Images */}
                    <div className="image-panel">
                        <div className="image-viewport">
                            {decision.image_urls && decision.image_urls.length > 1 && (
                                <>
                                    <button
                                        className="nav-btn prev"
                                        onClick={() => setCurrentImageIndex(p => Math.max(0, p - 1))}
                                        disabled={currentImageIndex === 0}
                                    ><ChevronRight size={24} /></button>
                                    <button
                                        className="nav-btn next"
                                        onClick={() => setCurrentImageIndex(p => Math.min(decision.image_urls.length - 1, p + 1))}
                                        disabled={currentImageIndex === decision.image_urls.length - 1}
                                    ><ChevronLeft size={24} /></button>
                                </>
                            )}
                            <div className="fit-container" style={{ transform: `scale(${zoom})` }}>
                                <img
                                    src={decision.image_urls?.[currentImageIndex]}
                                    alt="Decision Scan"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Side: HTML rendered natively via iframe */}
                    <div className="html-panel">
                        {htmlDoc ? (
                            <iframe
                                srcDoc={htmlDoc}
                                className="html-iframe"
                                title="قرار تمييزي"
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top right' }}
                            />
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <p>جاري تحميل المستند...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .detail-page {
                    height: calc(100vh - 64px);
                    display: flex;
                    flex-direction: column;
                    background: #f1f5f9;
                    overflow: hidden;
                    font-family: 'Cairo', sans-serif;
                }

                .action-bar {
                    height: 50px;
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 24px;
                    flex-shrink: 0;
                    z-index: 10;
                }

                .action-left, .action-right { display: flex; align-items: center; gap: 16px; }
                .action-btn-back {
                    display: flex; align-items: center; gap: 8px; background: none; border: none;
                    color: #64748b; font-weight: 600; cursor: pointer; font-size: 14px;
                    transition: color 0.2s;
                }
                .action-btn-back:hover { color: #0f172a; }
                .top-title { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
                
                .divider { width: 1px; height: 24px; background: #e2e8f0; }
                
                .view-selector { display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; gap: 2px; }
                .view-selector button {
                    display: flex; align-items: center; justify-content: center;
                    background: none; border: none; padding: 6px 10px; border-radius: 6px;
                    color: #64748b; cursor: pointer; transition: all 0.2s;
                }
                .view-selector button.active { background: white; color: #f43f5e; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .view-selector button:hover:not(.active) { background: #e2e8f0; color: #0f172a; }
                
                .zoom-controls { display: flex; align-items: center; gap: 12px; color: #475569; font-weight: 600; font-size: 13px; }
                .zoom-controls button { background: #f1f5f9; border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: #64748b; }
                .zoom-controls button:hover { background: #e2e8f0; color: #0f172a; }

                .print-btn {
                    background: #f43f5e; color: white; border: none; padding: 8px 16px;
                    border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
                    display: flex; align-items: center; gap: 8px; transition: all 0.2s;
                }
                .print-btn:hover { background: #e11d48; }

                /* ── Viewer Layout ── */
                .viewer-container {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                    gap: 2px;
                    background: #e2e8f0;
                }
                
                .image-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #f1f5f9;
                    overflow: hidden;
                }

                .html-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: #f1f5f9;
                    overflow: hidden;
                    padding: 12px;
                }

                /* ── Image Panel ── */
                .image-viewport {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }

                .fit-container {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                }

                .fit-container img {
                    max-height: 98%;
                    max-width: 98%;
                    height: auto;
                    width: auto;
                    object-fit: contain;
                    border-radius: 2px;
                }

                .nav-btn {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0;
                    padding: 12px; border-radius: 50%; cursor: pointer; color: #0f172a;
                    z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    transition: all 0.2s;
                }
                .nav-btn:hover { background: white; transform: translateY(-50%) scale(1.1); }
                .nav-btn:disabled { opacity: 0.15; cursor: not-allowed; }
                .nav-btn.prev { right: 16px; }
                .nav-btn.next { left: 16px; }

                /* ── HTML iframe Panel ── */
                .html-iframe {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: transparent;
                    transition: transform 0.15s ease-out;
                }

                /* ── Print ── */
                @media print {
                    .no-print { display: none !important; }
                    .detail-page { height: auto; overflow: visible; background: white; padding: 0; }
                    .viewer-container { display: block; background: transparent; }
                    .image-panel { display: none !important; }
                    .html-panel { width: 100%; overflow: visible; }
                    .html-iframe { transform: none !important; }
                }
                
                /* ── Layout Modes ── */
                .mode-image-only .html-panel { display: none; }
                .mode-html-only .image-panel { display: none; }
            `}</style>
        </Layout>
    );
};

export default withAuth(DecisionDetail);
