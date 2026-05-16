import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { FiPhone, FiMail, FiClock, FiArrowLeft, FiChevronLeft, FiMessageCircle, FiChevronDown } from 'react-icons/fi';
import Link from 'next/link';

const SupportPage = () => {
  const [activeTab, setActiveTab] = useState('contact');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDetails, setTicketDetails] = useState('');

  const handleTicketSubmit = () => {
    if (ticketName && ticketEmail && ticketSubject && ticketDetails) {
      setTicketSubmitted(true);
    }
  };

  return (
    <Layout>
      <Head>
        <title>اتصل بنا - الدعم الفني</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="support-page">
        {/* Main Layout with Sidebar */}
        <div className="support-layout">
          {/* Sidebar Menu */}
          <div className="sidebar-menu">
            <button 
              className={`menu-item ${activeTab === 'ticket' ? 'active' : ''}`}
              onClick={() => setActiveTab('ticket')}
            >
              <span>تذكرة دعم فني</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              <span>الأسئلة الشائعة</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => setActiveTab('contact')}
            >
              <span>اتصل بنا</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="main-content">
            {activeTab === 'contact' && (
              <>
                {/* Intro Card */}
                <div className="intro-card">
                  <p className="intro-text">
                    فريق الدعم الفني متاح لمساعدتك في أي وقت. يمكنك التواصل معنا عبر القنوات التالية:
                  </p>
                </div>

                {/* Contact Cards */}
                <div className="contact-cards">
              {/* Phone Card */}
              <a href="tel:+9647506626622" className="contact-card">
                <div className="contact-icon-wrapper">
                  <FiPhone className="contact-icon" />
                </div>
                <div className="contact-content">
                  <h3 className="contact-title">الهاتف</h3>
                  <p className="contact-value">+964 750 662 6622</p>
                  <p className="contact-subtitle">متاح من الساعة 9 صباحاً حتى 6 مساءً</p>
                </div>
                <FiChevronLeft className="contact-arrow" />
              </a>

              {/* Email Card */}
              <a href="mailto:info@mohamipro.com" className="contact-card">
                <div className="contact-icon-wrapper">
                  <FiMail className="contact-icon" />
                </div>
                <div className="contact-content">
                  <h3 className="contact-title">البريد الإلكتروني</h3>
                  <p className="contact-value">info@mohamipro.com</p>
                </div>
                <FiChevronLeft className="contact-arrow" />
              </a>

              {/* WhatsApp Card */}
              <a href="https://wa.me/9647506626622" className="contact-card">
                <div className="contact-icon-wrapper whatsapp">
                  <FiMessageCircle className="contact-icon" />
                </div>
                <div className="contact-content">
                  <h3 className="contact-title">واتساب</h3>
                  <p className="contact-value">+964 750 662 6622</p>
                  <p className="contact-subtitle">دعم فني سريع</p>
                </div>
                <FiChevronLeft className="contact-arrow" />
              </a>
            </div>

            {/* Footer Info Card */}
            <div className="footer-info-card">
              <div className="info-row">
                <div className="info-icon-wrapper">
                  <FiClock className="info-icon" />
                </div>
                <div className="info-content">
                  <p className="info-label">أوقات العمل</p>
                  <p className="info-value">الأحد - الخميس، 9:00 ص - 6:00 م</p>
                </div>
              </div>
              <div className="info-divider"></div>
              <div className="info-row">
                <div className="info-icon-wrapper">
                  <FiClock className="info-icon" />
                </div>
                <div className="info-content">
                  <p className="info-label">زمن الاستجابة</p>
                  <p className="info-value">خلال 24 ساعة عمل للحالات العادية</p>
                </div>
              </div>
            </div>
            </>
            )}

            {/* Ticket Tab Content */}
            {activeTab === 'ticket' && (
              <>
                <div className="intro-card">
                  <h2 className="section-title">تذكرة دعم فني</h2>
                  <p className="intro-text">
                    يمكنك إنشاء تذكرة دعم فني للحصول على مساعدة بشأن أي مشكلة تواجهها في النظام.
                  </p>
                  <div className="ticket-form">
                    <div className="form-group">
                      <label className="form-label">الاسم</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="أدخل اسمك"
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        placeholder="أدخل بريدك الإلكتروني"
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الموضوع</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="أدخل موضوع المشكلة"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">التفاصيل</label>
                      <textarea 
                        className="form-textarea" 
                        placeholder="اشرح المشكلة بالتفصيل" 
                        rows="5"
                        value={ticketDetails}
                        onChange={(e) => setTicketDetails(e.target.value)}
                      ></textarea>
                    </div>
                    <button className="submit-button" onClick={handleTicketSubmit}>إرسال التذكرة</button>
                  </div>
                </div>
                {ticketSubmitted && (
                  <div className="confirmation-message">
                    <div className="confirmation-icon">
                      <FiMail />
                    </div>
                    <h3 className="confirmation-title">تم إرسال التذكرة بنجاح</h3>
                    <p className="confirmation-text">شكراً لك! سيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.</p>
                  </div>
                )}
              </>
            )}

            {/* FAQ Tab Content */}
            {activeTab === 'faq' && (
              <>
                <div className="intro-card">
                  <h2 className="section-title">الأسئلة الشائعة</h2>
                  <div className="faq-list">
                    <div 
                      className={`faq-item ${expandedFaq === 0 ? 'expanded' : ''}`}
                      onClick={() => setExpandedFaq(expandedFaq === 0 ? null : 0)}
                    >
                      <div className="faq-header">
                        <h3 className="faq-question">كيف يمكنني إضافة قضية جديدة؟</h3>
                        <FiChevronDown className={`faq-chevron ${expandedFaq === 0 ? 'rotated' : ''}`} />
                      </div>
                      {expandedFaq === 0 && (
                        <p className="faq-answer">يمكنك إضافة قضية جديدة من خلال الضغط على زر "قضية جديدة" في الصفحة الرئيسية ثم ملء البيانات المطلوبة.</p>
                      )}
                    </div>
                    <div 
                      className={`faq-item ${expandedFaq === 1 ? 'expanded' : ''}`}
                      onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                    >
                      <div className="faq-header">
                        <h3 className="faq-question">كيف يمكنني إضافة موكل جديد؟</h3>
                        <FiChevronDown className={`faq-chevron ${expandedFaq === 1 ? 'rotated' : ''}`} />
                      </div>
                      {expandedFaq === 1 && (
                        <p className="faq-answer">يمكنك إضافة موكل جديد من خلال الضغط على زر "موكل جديد" في الصفحة الرئيسية ثم إدخال بيانات الموكل.</p>
                      )}
                    </div>
                    <div 
                      className={`faq-item ${expandedFaq === 2 ? 'expanded' : ''}`}
                      onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                    >
                      <div className="faq-header">
                        <h3 className="faq-question">كيف يمكنني إدارة الدفعات والمصروفات؟</h3>
                        <FiChevronDown className={`faq-chevron ${expandedFaq === 2 ? 'rotated' : ''}`} />
                      </div>
                      {expandedFaq === 2 && (
                        <p className="faq-answer">يمكنك إدارة الدفعات والمصروفات من قسم المحاسبة حيث يمكنك إضافة وتعديل وعرض جميع المعاملات المالية.</p>
                      )}
                    </div>
                    <div 
                      className={`faq-item ${expandedFaq === 3 ? 'expanded' : ''}`}
                      onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                    >
                      <div className="faq-header">
                        <h3 className="faq-question">كيف يمكنني التواصل مع الدعم الفني؟</h3>
                        <FiChevronDown className={`faq-chevron ${expandedFaq === 3 ? 'rotated' : ''}`} />
                      </div>
                      {expandedFaq === 3 && (
                        <p className="faq-answer">يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني أو واتساب من خلال صفحة "اتصل بنا".</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Cairo', 'Tajawal', sans-serif;
          background-color: #f8fafc;
          direction: rtl;
        }
      `}</style>

      <style jsx>{`
        .support-page {
          min-height: 100vh;
          background: #f1f5f9;
          padding-bottom: 40px;
        }

        /* Main Layout with Sidebar */
        .support-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 12px;
        }

        /* Sidebar Menu */
        .sidebar-menu {
          display: flex;
          flex-direction: row;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
        }

        .sidebar-menu::-webkit-scrollbar {
          display: none;
        }

        .menu-item {
          padding: 12px 16px;
          border: none;
          background: white;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: right;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .menu-item.active {
          background: #3b82f6;
          color: white;
        }

        .menu-item:hover:not(.active) {
          background: #f1f5f9;
        }

        /* Main Content Area */
        .main-content {
          flex: 1;
        }

        /* Intro Card */
        .intro-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .intro-text {
          font-size: 15px;
          line-height: 1.8;
          color: #475569;
          font-weight: 500;
        }

        /* Contact Cards */
        .contact-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .contact-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border-radius: 12px;
          padding: 12px 16px;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          cursor: pointer;
        }

        .contact-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-icon-wrapper.whatsapp {
          background: #dcfce7;
        }

        .contact-icon {
          width: 20px;
          height: 20px;
          color: #3b82f6;
        }

        .contact-icon-wrapper.whatsapp .contact-icon {
          color: #22c55e;
        }

        .contact-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .contact-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .contact-value {
          font-size: 14px;
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 0;
          direction: ltr;
        }

        .contact-subtitle {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .contact-arrow {
          width: 16px;
          height: 16px;
          color: #cbd5e1;
          flex-shrink: 0;
        }

        /* Footer Info Card */
        .footer-info-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #bfdbfe;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .info-icon {
          width: 18px;
          height: 18px;
          color: #3b82f6;
        }

        .info-content {
          flex: 1;
        }

        .info-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .info-divider {
          height: 1px;
          background: rgba(59, 130, 246, 0.2);
          margin: 16px 0;
        }

        /* Section Title */
        .section-title {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
        }

        /* Ticket Form */
        .ticket-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 700px;
          margin: 0 auto;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 15px;
          font-weight: 600;
          color: #475569;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 14px 18px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          font-size: 15px;
          color: #1e293b;
          background: white;
          resize: none;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .submit-button {
          padding: 16px 32px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Cairo', 'Tajawal', sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          width: fit-content;
        }

        /* Confirmation Message */
        .confirmation-message {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin-top: 20px;
          border: 1px solid #86efac;
        }

        .confirmation-icon {
          width: 64px;
          height: 64px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
          color: #22c55e;
        }

        .confirmation-icon svg {
          width: 32px;
          height: 32px;
        }

        .confirmation-title {
          font-size: 20px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 8px;
        }

        .confirmation-text {
          font-size: 15px;
          color: #15803d;
          font-weight: 500;
          line-height: 1.6;
        }

        /* FAQ List */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 700px;
          margin: 0 auto;
        }

        .faq-item {
          background: white;
          border-radius: 12px;
          padding: 0;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .faq-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
        }

        .faq-question {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          flex: 1;
        }

        .faq-chevron {
          width: 20px;
          height: 20px;
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .faq-chevron.rotated {
          transform: rotate(180deg);
        }

        .faq-answer {
          font-size: 14px;
          line-height: 1.7;
          color: #475569;
          font-weight: 500;
          padding: 0 20px 16px 20px;
          margin: 0;
        }

        /* Tablet/iPad Responsive */
        @media (min-width: 640px) {
          .support-layout {
            padding: 20px 24px;
          }

          .sidebar-menu {
            flex-direction: column;
            overflow-x: visible;
          }

          .menu-item {
            padding: 14px 20px;
            font-size: 15px;
            white-space: normal;
          }

          .intro-card {
            padding: 24px;
          }

          .contact-card {
            padding: 16px 20px;
          }

          .confirmation-message {
            padding: 28px;
          }
        }

        /* Desktop Responsive */
        @media (min-width: 768px) {
          .support-page {
            max-width: 1400px;
            margin: 0 auto;
            background: #f1f5f9;
            min-height: 100vh;
            padding: 40px 40px 40px 20px;
          }

          .support-layout {
            display: flex;
            flex-direction: row;
            gap: 48px;
            padding: 0;
          }

          .sidebar-menu {
            width: 320px;
            flex-shrink: 0;
            position: sticky;
            top: 32px;
            height: fit-content;
          }

          .menu-item {
            padding: 16px 24px;
            font-size: 16px;
          }

          .main-content {
            flex: 1;
          }

          .intro-card {
            max-width: 100%;
            margin-bottom: 32px;
            padding: 28px 32px;
            border-radius: 20px;
          }

          .intro-text {
            font-size: 17px;
            line-height: 1.8;
          }

          .contact-cards {
            max-width: 100%;
            margin-bottom: 32px;
            gap: 16px;
          }

          .contact-card {
            padding: 24px 32px;
            border-radius: 20px;
          }

          .contact-icon-wrapper {
            width: 56px;
            height: 56px;
            border-radius: 14px;
          }

          .contact-icon {
            width: 28px;
            height: 28px;
          }

          .contact-title {
            font-size: 18px;
          }

          .contact-value {
            font-size: 17px;
          }

          .contact-subtitle {
            font-size: 14px;
          }

          .contact-arrow {
            width: 24px;
            height: 24px;
          }

          .footer-info-card {
            max-width: 100%;
            padding: 28px 32px;
            border-radius: 20px;
          }

          .info-label {
            font-size: 15px;
          }

          .info-value {
            font-size: 16px;
          }

          .ticket-form,
          .faq-list {
            max-width: 100%;
          }
        }

        @media (min-width: 1024px) {
          .support-page {
            max-width: 1600px;
            padding: 40px 40px 40px 16px;
          }

          .sidebar-menu {
            width: 340px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default SupportPage;
