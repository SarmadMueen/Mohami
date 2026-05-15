import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  FileText,
  Search,
  Shield,
  Scale,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const LegalServicesPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const services = [
    {
      id: 'consultations',
      title: 'الاستشارات القانونية',
      description: 'تقديم المشورة القانونية المتخصصة في مختلف المجالات المدنية، الجنائية، والتجارية.',
      icon: <Scale className="service-icon" />,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      link: '/services/add-consultation'
    },
    {
      id: 'contracts',
      title: 'مراجعة وصياغة العقود',
      description: 'صياغة ومراجعة كافة أنواع العقود والاتفاقيات لضمان حماية الحقوق وتجنب الثغرات.',
      icon: <FileText className="service-icon" />,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      link: '/services/add-contract-review'
    },
    {
      id: 'documents',
      title: 'مراجعة الأوراق القانونية',
      description: 'تدقيق الأوراق والمستندات القانونية للتأكد من سلامتها ومطابقتها للقانون.',
      icon: <Search className="service-icon" />,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      link: '/services/add-document-review'
    }
  ];

  if (!mounted) return null;

  return (
    <Layout>
      <Head>
        <title>الخدمات القانونية | Mohami Pro</title>
        <meta name="description" content="البوابة المركزية للخدمات القانونية المتخصصة - استشارات، عقود، وتدقيق." />
      </Head>

      <div className="legal-services-container">
        <style jsx>{`
          .legal-services-container {
            padding: 2.5rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
            direction: rtl;
            font-family: 'Cairo', sans-serif;
          }

          .header-section {
            margin-bottom: 2.5rem;
            position: relative;
          }

          .page-title {
            font-size: 2.25rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
          }

          .title-wrapper {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
            flex-wrap: wrap;
          }

          .reports-button {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            background: white;
            color: #1a1a1a;
            padding: 0.75rem 1.25rem;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.9375rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.2s;
            cursor: pointer;
          }

          .reports-button:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
          }

          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
          }

          .service-card {
            background: white;
            border-radius: 20px;
            padding: 1.75rem;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            cursor: pointer;
            min-height: 180px;
            transition: border-color 0.2s;
          }

          .service-card:hover {
            border-color: #cbd5e1;
          }

          .card-bg-icon {
            position: absolute;
            top: -15px;
            left: -15px;
            font-size: 6rem;
            opacity: 0.03;
            transform: rotate(-15deg);
            z-index: 0;
          }

          .icon-wrapper {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.25rem;
            position: relative;
            z-index: 1;
            color: white;
            box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.1);
          }

          .service-icon {
            width: 24px;
            height: 24px;
          }

          .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.75rem;
            position: relative;
            z-index: 1;
          }

          .card-description {
            font-size: 0.9375rem;
            color: #64748b;
            line-height: 1.5;
            position: relative;
            z-index: 1;
            flex-grow: 1;
          }

          @media (max-width: 1024px) {
            .services-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 768px) {
            .legal-services-container {
              padding: 1.5rem;
            }
            .page-title {
              font-size: 1.75rem;
            }
            .services-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="header-section">
          <div className="title-wrapper">
            <div>
              <h1 className="page-title">الخدمات القانونية</h1>
            </div>
            <button
              className="reports-button"
              onClick={() => router.push('/accounting/accounting?tab=legal-services-fees')}
            >
              <TrendingUp size={18} />
              <span>التقارير المالية</span>
            </button>
          </div>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div key={service.id} className="service-card" onClick={() => router.push(service.link)}>
              <div className="card-bg-icon">
                {service.icon}
              </div>
              <div className="icon-wrapper" style={{ background: service.gradient }}>
                {service.icon}
              </div>
              <h3 className="card-title">{service.title}</h3>
              <p className="card-description">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default LegalServicesPage;
