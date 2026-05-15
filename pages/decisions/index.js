import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import {
    Gavel,
    Search,
    Calendar,
    Hash,
    ArrowLeft,
    ChevronLeft,
    Filter,
    Clock,
    FileText,
    Sparkles
} from 'lucide-react';

const DecisionsPage = () => {
    const router = useRouter();
    const [decisions, setDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('الكل');

    const categories = ['الكل', 'جنائي', 'مدني', 'أحوال شخصية', 'عمل', 'تجاري'];

    useEffect(() => {
        fetchDecisions();
    }, []);

    const fetchDecisions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('court_decisions')
                .select('*')
                .order('decision_date', { ascending: false });

            if (error) throw error;
            setDecisions(data || []);
        } catch (error) {
            console.error('Error fetching decisions:', error);
        } finally {
            setLoading(false);
        }
    };

    const cleanDecisionSnippet = (text) => {
        if (!text) return '';

        // Remove common legal markers and everything before them
        const markers = [
            'أصدرت القرار الآتي :-',
            'القرار الآتي :-',
            'أصدرت المحكمة ما يلي:-',
            'القرار الآتي:',
            'وأصدرت القرار الآتي :'
        ];

        let cleaned = text;
        for (const marker of markers) {
            const index = text.indexOf(marker);
            if (index !== -1) {
                cleaned = text.substring(index + marker.length).trim();
                break;
            }
        }

        // Fallback: Skip "Republic of Iraq" if marker not found
        if (cleaned.startsWith('جمهورية العراق')) {
            const lines = cleaned.split('\n');
            if (lines.length > 3) cleaned = lines.slice(3).join(' ').trim();
        }

        return cleaned.length > 220 ? cleaned.substring(0, 220).trim() + '...' : cleaned;
    };

    const filteredDecisions = decisions.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.decision_number && d.decision_number.includes(searchQuery));
        const matchesCategory = selectedCategory === 'الكل' || d.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <Layout>
            <Head>
                <title>القرارات التمييزية - محامي برو</title>
            </Head>

            <div className="decisions-page" dir="rtl">
                {/* Header Section */}
                <div className="page-header">
                    <h1 className="page-title">القرارات التمييزية</h1>
                    <p className="page-subtitle">مكتبة القرارات الرسمية لمحكمة التمييز والاستئناف</p>
                </div>

                {/* Search & Filter Bar */}
                <div className="filter-section">
                    <div className="search-box">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="ابحث برقم القرار أو العنوان..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="category-filters">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Section */}
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={48} />
                        <p>جاري تحميل القرارات...</p>
                    </div>
                ) : filteredDecisions.length === 0 ? (
                    <div className="empty-state">
                        <Gavel size={64} opacity={0.2} />
                        <h3>لا توجد نتائج مطابقة</h3>
                        <p>جرب تغيير كلمات البحث أو التصنيف المختارة</p>
                    </div>
                ) : (
                    <div className="decisions-grid">
                        {filteredDecisions.map(decision => (
                            <div
                                key={decision.id}
                                className="decision-card"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push(`/decisions/${decision.id}`);
                                }}
                            >
                                <div className="card-top">
                                    <div className="card-tag">{decision.category}</div>
                                    <div className="view-action">
                                        <span>عرض القرار</span>
                                        <ChevronLeft size={16} />
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="decision-meta">
                                        <div className="meta-item">
                                            <Hash size={14} />
                                            <span>رقم: {decision.decision_number || '—'}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>تاريخ: {decision.decision_date || '—'}</span>
                                        </div>
                                    </div>
                                    {decision.description && (
                                        <p className="decision-desc">{cleanDecisionSnippet(decision.description)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .decisions-page {
                    padding: 32px 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                    min-height: 100vh;
                    font-family: 'Cairo', sans-serif;
                }
                
                .page-header {
                    margin-bottom: 32px;
                }
                .page-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #3b82f6;
                }
                .page-subtitle {
                    margin: 12px 0 0;
                    color: #64748b;
                    font-size: 16px;
                }

                .filter-section {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    margin-bottom: 32px;
                }
                .search-box {
                    position: relative;
                    width: 100%;
                    max-width: 600px;
                }
                .search-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-box input {
                    width: 100%; padding: 14px 48px 14px 16px; border-radius: 12px;
                    border: 1px solid #e2e8f0; background: white; font-family: inherit;
                    font-size: 15px; outline: none; transition: all 0.2s;
                }
                .search-box input:focus { border-color: #f43f5e; box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.1); }
                
                .category-filters {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .filter-pill {
                    padding: 8px 18px; border-radius: 99px; background: white;
                    border: 1px solid #e2e8f0; cursor: pointer; font-size: 14px;
                    font-weight: 600; color: #64748b; transition: all 0.2s;
                }
                .filter-pill:hover { border-color: #f43f5e; color: #f43f5e; }
                .filter-pill.active { background: #f43f5e; color: white; border-color: #f43f5e; }

                .decisions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }
                .decision-card {
                    background: white; border-radius: 16px; border: 1px solid #e2e8f0;
                    padding: 20px; transition: none !important;
                    display: flex; flex-direction: column; position: relative; overflow: hidden;
                    cursor: pointer;
                    z-index: 1;
                }
                .decision-card:hover { 
                    background: #f8fafc;
                    border-color: #cbd5e1 !important;
                }
                .decision-card:hover .view-action {
                    color: #e11d48;
                }
                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .card-tag {
                    background: #fff1f2; color: #e11d48;
                    padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;
                }
                .view-action {
                    display: flex; align-items: center; gap: 4px; color: #f43f5e;
                    font-size: 13px; font-weight: 700;
                }
                .card-body { flex: 1; }
                .decision-title { font-size: 18px; font-weight: 700; color: #1e293b; line-height: 1.5; margin-bottom: 12px; }
                .decision-meta { display: flex; gap: 16px; margin-bottom: 15px; }
                .meta-item { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px; font-weight: 500; }
                .decision-desc { color: #475569; font-size: 14px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                
                .loading-state, .empty-state {
                    padding: 100px 0; text-align: center; color: #94a3b8;
                    display: flex; flex-direction: column; align-items: center; gap: 16px;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </Layout>
    );
};

const RefreshCw = ({ size, className }) => (
    <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className={className}
    >
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);

export default withAuth(DecisionsPage);
