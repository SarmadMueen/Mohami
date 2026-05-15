import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import { Search, BookOpen, FileText, Calendar, Hash, ArrowLeft } from 'lucide-react';

const PersonalStatusPage = () => {
  const router = useRouter();
  const [legalCodes, setLegalCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchLegalCodes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCodes(legalCodes);
    } else {
      const filtered = legalCodes.filter(code => 
        code.article_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.article_no?.toString().includes(searchQuery) ||
        code.law_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCodes(filtered);
    }
  }, [searchQuery, legalCodes]);

  // Function to split article content if it contains multiple articles
  const splitArticleContent = (articleContent, articleNumber) => {
    if (!articleContent) return [{ articleNumber, content: articleContent }];
    
    // Pattern to match "مادة" or "المادة" followed by a number
    const articlePattern = /(?:المادة|مادة)\s+(\d+)/g;
    const articles = [];
    let matches = [];
    let match;
    
    // Find all article markers with their positions
    while ((match = articlePattern.exec(articleContent)) !== null) {
      matches.push({
        index: match.index,
        articleNumber: match[1],
        fullMatch: match[0]
      });
    }
    
    // If no other articles found or only one match that matches the current article number
    if (matches.length === 0) {
      return [{ articleNumber, content: articleContent }];
    }
    
    // Check if there are multiple different article numbers
    const uniqueArticleNumbers = [...new Set(matches.map(m => m.articleNumber))];
    if (uniqueArticleNumbers.length === 1 && uniqueArticleNumbers[0] === articleNumber) {
      return [{ articleNumber, content: articleContent }];
    }
    
    // Split content based on article markers
    let currentArticleNumber = articleNumber;
    let startIndex = 0;
    
    matches.forEach((matchItem, index) => {
      // Extract content before this match (belongs to previous article)
      if (matchItem.index > startIndex) {
        const content = articleContent.substring(startIndex, matchItem.index).trim();
        // Remove the article marker from content if it's at the start
        const cleanContent = content.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
        if (cleanContent) {
          articles.push({
            articleNumber: currentArticleNumber,
            content: cleanContent
          });
        }
      }
      
      // Update for next iteration
      currentArticleNumber = matchItem.articleNumber;
      startIndex = matchItem.index;
    });
    
    // Add the remaining content after the last match
    if (startIndex < articleContent.length) {
      let content = articleContent.substring(startIndex).trim();
      // Remove the article marker from content if it's at the start
      content = content.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
      if (content) {
        articles.push({
          articleNumber: currentArticleNumber,
          content: content
        });
      }
    }
    
    // If we didn't create any articles, return original
    if (articles.length === 0) {
      return [{ articleNumber, content: articleContent }];
    }
    
    return articles;
  };

  const fetchLegalCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('law_id', 'law_188_1959');

      if (error) {
        console.error('Error fetching legal codes:', error);
        setLegalCodes([]);
      } else {
        // Process and split articles that contain multiple articles
        const processedCodes = [];
        (data || []).forEach(code => {
          const splitArticles = splitArticleContent(code.article_text, code.article_no);
          
          splitArticles.forEach((article, index) => {
            processedCodes.push({
              ...code,
              id: `${code.id}-${index}`, // Unique ID for each split article
              article_no: article.articleNumber,
              article_text: article.content,
              // Convert article_no to number for proper sorting
              article_no_numeric: parseInt(article.articleNumber) || 0
            });
          });
        });
        
        // Sort by numeric article number
        processedCodes.sort((a, b) => {
          const numA = parseInt(a.article_no) || 0;
          const numB = parseInt(b.article_no) || 0;
          return numA - numB;
        });
        
        setLegalCodes(processedCodes);
        setFilteredCodes(processedCodes);
      }
    } catch (error) {
      console.error('Error:', error);
      setLegalCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const groupByChapter = (codes) => {
    const grouped = {};
    codes.forEach(code => {
      // Use bab (chapter) if available, otherwise use fasl (section), otherwise 'غير محدد'
      const chapter = code.bab || code.fasl || 'غير محدد';
      if (!grouped[chapter]) {
        grouped[chapter] = [];
      }
      grouped[chapter].push(code);
    });
    return grouped;
  };

  const groupedCodes = groupByChapter(filteredCodes);

  return (
    <Layout>
      <Head>
        <title>قانون الأحوال الشخصية - نظام إدارة القضايا</title>
      </Head>
      <div style={{ padding: '24px', direction: 'rtl', minHeight: '100vh', background: 'transparent' }}>
        {/* Header */}
        <div style={{ 
          background: 'transparent', 
          borderRadius: '16px', 
          padding: '32px',
          marginBottom: '24px',
          boxShadow: 'none'
        }}>
          {/* Breadcrumb */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '16px',
            fontSize: '15px',
            color: '#64748b'
          }}>
            <span 
              onClick={() => router.push('/laws')}
              style={{ 
                cursor: 'pointer',
                color: '#2563eb',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              القوانين
            </span>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#1e293b', fontWeight: '500' }}>الأحوال الشخصية</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={() => router.push('/laws')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ArrowLeft size={24} style={{ color: '#64748b' }} />
            </button>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <BookOpen size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                قانون الأحوال الشخصية العراقي
              </h1>
              <p style={{ fontSize: '16px', color: '#64748b', margin: '8px 0 0 0' }}>
                القانون رقم 188 لسنة 1959 وتعديلاته
              </p>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                fontSize: '14px',
                color: '#64748b',
                marginTop: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>إجمالي المواد:</span>
                  <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
                    {filteredCodes.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>عدد الفصول/الأبواب:</span>
                  <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
                    {Object.keys(groupedCodes).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                right: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} 
            />
            <input
              type="text"
              placeholder="ابحث في المواد القانونية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 48px 14px 16px',
                fontSize: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.3s',
                fontFamily: 'Almarai, sans-serif'
              }}
              onFocus={(e) => e.target.style.borderColor = '#ef4444'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: 'transparent',
            borderRadius: '16px',
            boxShadow: 'none'
          }}>
            <div style={{ fontSize: '18px', color: '#64748b' }}>جاري التحميل...</div>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: 'transparent',
            borderRadius: '16px',
            boxShadow: 'none'
          }}>
            <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '8px' }}>
              لا توجد نتائج
            </div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              لم يتم العثور على مواد قانونية تطابق البحث
            </div>
          </div>
        ) : (
          <div>

            {/* Articles List */}
            {Object.keys(groupedCodes).map((chapter, index) => (
              <div 
                key={chapter} 
                style={{ 
                  background: 'transparent',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: 'none'
                }}
              >
                {chapter !== 'غير محدد' && (
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Hash size={20} style={{ color: '#ef4444' }} />
                    {chapter}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {groupedCodes[chapter].map((code) => (
                    <div
                      key={code.id}
                      onClick={() => setSelectedArticle(selectedArticle?.id === code.id ? null : code)}
                      style={{
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        background: selectedArticle?.id === code.id ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedArticle?.id !== code.id) {
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedArticle?.id !== code.id) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            minWidth: '80px',
                            textAlign: 'center'
                          }}>
                            المادة {code.article_no}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: '16px',
                        color: '#334155',
                        lineHeight: '1.8',
                        textAlign: 'right',
                        marginTop: '12px'
                      }}>
                        {code.article_text}
                      </div>

                      {code.fasl && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #e5e7eb',
                          fontSize: '14px',
                          color: '#64748b'
                        }}>
                          الفصل: {code.fasl}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
        body {
          font-family: 'Almarai', sans-serif;
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(PersonalStatusPage);

