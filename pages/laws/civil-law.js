import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import { Search, BookOpen, FileText, Calendar, Hash, ArrowLeft } from 'lucide-react';

const CivilLawPage = () => {
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
        code.article_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.article_number?.includes(searchQuery) ||
        code.law_name_ar?.toLowerCase().includes(searchQuery.toLowerCase())
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
      
      // Fetch from civil_law table
      console.log('Fetching civil law from civil_law table...');
      const { data, error } = await supabase
        .from('civil_law')
        .select('*')
        .order('article_number', { ascending: true });

      console.log('Query result - Error:', error);
      console.log('Query result - Data count:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Sample data:', data[0]);
      }

      if (error) {
        console.error('Error fetching civil law:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setLegalCodes([]);
        setFilteredCodes([]);
        return;
      }

      console.log('Fetched civil law data:', data);
      console.log('Number of records:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('No civil law data found');
        setLegalCodes([]);
        setFilteredCodes([]);
        return;
      }

      // Process and split articles that contain multiple articles
      const processedCodes = [];
      (data || []).forEach(code => {
        // Handle case where article_content might be null or undefined
        if (!code.article_content) {
          console.warn('Article content is missing for article:', code.article_number);
          // Still add the code even if content is missing
          processedCodes.push({
            ...code,
            article_number: String(code.article_number || ''),
            article_number_numeric: parseInt(code.article_number) || 0
          });
          return;
        }

        // Ensure article_number is a string for comparison
        const articleNumberStr = String(code.article_number || '');
        const splitArticles = splitArticleContent(code.article_content, articleNumberStr);
        
        splitArticles.forEach((article, index) => {
          processedCodes.push({
            ...code,
            id: `${code.id}-${index}`, // Unique ID for each split article
            article_number: article.articleNumber,
            article_content: article.content || code.article_content,
            // Convert article_number to number for proper sorting
            article_number_numeric: parseInt(article.articleNumber) || 0
          });
        });
      });
      
      console.log('Processed codes:', processedCodes.length);
      
      // Sort by numeric article number
      processedCodes.sort((a, b) => {
        const numA = parseInt(a.article_number) || 0;
        const numB = parseInt(b.article_number) || 0;
        return numA - numB;
      });
      
      setLegalCodes(processedCodes);
      setFilteredCodes(processedCodes);
    } catch (error) {
      console.error('Error fetching civil law:', error);
      setLegalCodes([]);
      setFilteredCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const groupByChapter = (codes) => {
    const grouped = {};
    codes.forEach(code => {
      // Use chapter_number if available, otherwise use book_number, otherwise 'غير محدد'
      const chapter = code.chapter_number || code.book_number || 'غير محدد';
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
        <title>القانون المدني العراقي - نظام إدارة القضايا</title>
      </Head>
      <div style={{ padding: '24px', direction: 'rtl', minHeight: '100vh', background: 'transparent' }}>
        {/* Header */}
        <div style={{ 
          background: 'transparent', 
          borderRadius: '16px', 
          padding: '24px',
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
            <span style={{ color: '#1e293b', fontWeight: '500' }}>القانون المدني</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
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
                transition: 'all 0.2s',
                flexShrink: 0
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
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <BookOpen size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                  القانون المدني العراقي
                </h1>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '14px',
                  color: '#64748b',
                  padding: '4px 12px',
                  background: '#f1f5f9',
                  borderRadius: '8px'
                }}>
                  <span>إجمالي المواد:</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {filteredCodes.length}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '14px',
                  color: '#64748b',
                  padding: '4px 12px',
                  background: '#f1f5f9',
                  borderRadius: '8px'
                }}>
                  <span>عدد الفصول/الأبواب:</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                    {Object.keys(groupedCodes).length}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 0 0' }}>
                القانون رقم 40 لسنة 1951
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                يحتوي هذا القانون على الأحكام والقواعد القانونية المتعلقة بالمعاملات المدنية والالتزامات والعقود في القانون العراقي
              </p>
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
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
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
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
              {searchQuery.trim() ? 'لم يتم العثور على مواد قانونية تطابق البحث' : 'لم يتم العثور على مواد قانونية في القانون المدني'}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '16px', padding: '12px', background: 'transparent', borderRadius: '8px' }}>
              <div>يرجى التحقق من:</div>
              <div style={{ marginTop: '8px' }}>1. وجود بيانات في جدول civil_law</div>
              <div>2. فتح Console في المتصفح للتحقق من الأخطاء</div>
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
                    <Hash size={20} style={{ color: '#10b981' }} />
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
                        background: selectedArticle?.id === code.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedArticle?.id !== code.id) {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.1)';
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
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            minWidth: '80px',
                            textAlign: 'center'
                          }}>
                            المادة {code.article_number}
                          </div>
                        </div>
                        {code.law_year && (
                          <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} />
                            {code.law_year}
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        fontSize: '16px',
                        color: '#334155',
                        lineHeight: '1.8',
                        textAlign: 'right',
                        marginTop: '12px'
                      }}>
                        {code.article_content}
                      </div>

                      {code.section_number && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #e5e7eb',
                          fontSize: '14px',
                          color: '#64748b'
                        }}>
                          القسم: {code.section_number}
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

export default withAuth(CivilLawPage);

