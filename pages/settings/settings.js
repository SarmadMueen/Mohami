import React from 'react';
import Layout from '../../components/layout/Layout';
import Head from 'next/head';
import Link from 'next/link';
import {
  HiOutlineCog,
  HiOutlineUser,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineOfficeBuilding,
  HiOutlineBadgeCheck
} from 'react-icons/hi';

const SettingsPage = () => {

  const settingsMenu = [
    {
      id: 'general',
      title: 'الإعدادات العامة',
      description: 'جميع الإعدادات التي تختص بالنظام بشكل عام مثل ترويسة المكتب، اسم المكتب، شعار المكتب و المعلومات العامة للمكتب.',
      icon: HiOutlineOfficeBuilding,
      link: '/settings/lawyer_settings',
      label: 'الإعدادات'
    },
    {
      id: 'license',
      title: 'ترخيص المكتب',
      description: 'عرض حالة ترخيص المكتب، نوع الباقة، تاريخ انتهاء الخدمة، والمساحة التخزينية المتاحة',
      icon: HiOutlineBadgeCheck,
      link: '/settings/subscription',
      label: 'الرخصة'
    },
    {
      id: 'app-values',
      title: 'قيم النظام',
      description: 'قيم النظام الثابتة التي تستخدمها كافة أنواع العمليات والوظائف على النظام مثل أسماء المحاكم وحالة القضايا',
      icon: HiOutlineDocumentText,
      link: '/settings/app_values',
      label: 'الإعدادات'
    },
    {
      id: 'users',
      title: 'المستخدمين',
      description: 'تسجيل والتحكم بحسابات المستخدمين كافة في النظام مثل تحديد الاقسام المخولين بدخولها و تغيير كلمة المرور للمستخدم، اسم المستخدم و الصلاحيات لكل فئة من حسابات المستخدمين.',
      icon: HiOutlineUser,
      link: '/settings/user_settings',
      label: 'المستخدمين'
    },
    {
      id: 'permissions',
      title: 'الصلاحيات',
      description: 'التحكم في صلاحيات المستخدمين والصلاحيات الممنوحة لجميع انواع الحسابات ماعدا الحسابات الرئيسية',
      icon: HiOutlineShieldCheck,
      link: '/settings/AccessControlPage',
      label: 'الصلاحيات'
    }
  ];

  return (
    <Layout>
      <Head>
        <title>إعدادات النظام</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="settings-page-container">
        <div className="settings-header">
          <div className="settings-title-wrapper">
            <HiOutlineCog className="settings-title-icon" />
            <h1 className="settings-title">إعدادات النظام</h1>
          </div>
          <p className="settings-description">
            جميع الإعدادات العامة المتعلقة بالنظام، مثل ترويسة المكتب واسم المكتب وشعار المكتب ومعلومات المكتب المتاحة.
          </p>
        </div>

        <div className="settings-grid">
          {settingsMenu.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link key={item.id} href={item.link}>
                <a className={`settings-card ${item.className || ''}`}>
                  <div className="settings-card-header">
                    <div className="settings-card-icon-wrapper">
                      <IconComponent className="settings-card-icon" />
                    </div>
                    <h3 className="settings-card-title">{item.title}</h3>
                  </div>
                  <p className="settings-card-description">{item.description}</p>
                </a>
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .settings-page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          direction: rtl;
          background-color: #F1F5F9;
          min-height: calc(100vh - 60px);
        }

        .settings-header {
          margin-bottom: 2rem;
        }

        .settings-title-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .settings-title-icon {
          font-size: 1.75rem;
          color: #3B82F6;
        }

        .settings-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .settings-description {
          font-size: 0.9375rem;
          color: #64748B;
          margin: 0;
          line-height: 1.6;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .settings-card {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          padding: 1.25rem 1.5rem;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          text-decoration: none;
          cursor: pointer;
        }

        .settings-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .settings-card-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #EFF6FF;
        }

        .settings-card-icon {
          font-size: 1.5rem;
          color: #3B82F6;
        }

        .settings-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .settings-card-description {
          font-size: 0.8125rem;
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        @media (max-width: 1024px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .settings-page-container {
            padding: 0.75rem;
            min-height: auto;
          }

          .settings-header {
            margin-bottom: 1rem;
          }

          .settings-title {
            font-size: 1.25rem;
          }

          .settings-description {
            font-size: 0.8125rem;
          }

          .settings-grid {
            gap: 0.625rem;
          }

          .settings-card {
            padding: 1rem;
            gap: 0.625rem;
          }

          .settings-card-icon-wrapper {
            width: 48px;
            height: 48px;
            border-radius: 10px;
          }

          .settings-card-icon {
            font-size: 1.375rem;
          }

          .settings-card-title {
            font-size: 0.9375rem;
          }

          .settings-card-description {
            font-size: 0.75rem;
            line-height: 1.4;
          }
        }
      `}</style>
    </Layout>
  );
};

export default SettingsPage;


