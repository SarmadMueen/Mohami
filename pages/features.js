import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
  Briefcase, Users, Scale, DollarSign, CalendarClock, FileText,
  Check, ArrowLeft, Mail, Lock, Eye, EyeOff, Twitter, Linkedin,
  Facebook, MapPin, Phone, Menu, X, Shield, Headphones, Zap,
  BarChart3, Bell, Smartphone, LayoutDashboard, FileCheck, Crown,
  Database, Star, HardDrive, ChevronDown, Brain, Cpu, Send,
  Gavel, FolderOpen, Clock, Search, FileSignature, Cloud, 
  ClipboardList, UsersRound, Rocket, CheckCircle2, ArrowRight,
  ListChecks, Receipt, Wallet, CalendarDays, BellRing, FileEdit,
  CloudCog, Target, UserCog, Sparkles, Monitor
} from 'lucide-react';
import Logo from '../components/Logo';

/* ─── Reusable animated-on-scroll hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Inline SVG Illustrations ─── */

const ExpertIllustration = () => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }} dir="ltr">
    <defs>
      <linearGradient id="exBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#F8FAFC"/></linearGradient>
    </defs>
    
    <rect width="500" height="400" rx="24" fill="url(#exBg)"/>

    {/* Background Bookcase (Right) */}
    <rect x="250" y="100" width="180" height="240" fill="#F8FAFC" rx="4"/>
    <rect x="260" y="120" width="160" height="60" fill="white" rx="2"/>
    <rect x="260" y="190" width="160" height="60" fill="white" rx="2"/>
    <rect x="260" y="260" width="160" height="70" fill="white" rx="2"/>
    {/* Abstract Books */}
    <rect x="270" y="140" width="12" height="40" fill="#E2E8F0" rx="2"/>
    <rect x="285" y="130" width="12" height="50" fill="#CBD5E1" rx="2"/>
    <rect x="300" y="150" width="12" height="30" fill="#E2E8F0" rx="2"/>
    <rect x="330" y="135" width="18" height="45" fill="#DBEAFE" rx="2"/>
    
    <rect x="265" y="210" width="12" height="40" fill="#E2E8F0" rx="2"/>
    <rect x="280" y="210" width="12" height="40" fill="#E2E8F0" rx="2" transform="rotate(15 280 210)"/>
    <rect x="320" y="200" width="12" height="50" fill="#CBD5E1" rx="2"/>
    
    <rect x="270" y="280" width="14" height="50" fill="#E2E8F0" rx="2"/>
    <rect x="290" y="270" width="15" height="60" fill="#DBEAFE" rx="2"/>
    <rect x="350" y="290" width="12" height="40" fill="#CBD5E1" rx="2"/>

    {/* Wall frames & shadow (Left) */}
    <rect x="70" y="40" width="140" height="200" fill="#F8FAFC" rx="8" opacity="0.6"/>
    
    {/* Clock */}
    <circle cx="210" cy="60" r="20" fill="#E2E8F0" opacity="0.5"/>
    <polyline points="210 52 210 60 215 65" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* Certificates */}
    <rect x="270" y="40" width="30" height="40" fill="white" stroke="#E2E8F0" strokeWidth="2" rx="2"/>
    <rect x="278" y="55" width="14" height="4" fill="#E2E8F0"/>
    <circle cx="285" cy="48" r="4" fill="#E2E8F0"/>
    
    <rect x="330" y="40" width="30" height="40" fill="white" stroke="#E2E8F0" strokeWidth="2" rx="2"/>
    <rect x="338" y="55" width="14" height="4" fill="#E2E8F0"/>
    <circle cx="345" cy="48" r="4" fill="#E2E8F0"/>

    {/* Floor ellipse */}
    <ellipse cx="250" cy="350" rx="180" ry="12" fill="#F1F5F9"/>

    {/* ----- FLAG POLE (Left) ----- */}
    {/* Base */}
    <path d="M75 350 L105 350 L95 340 L85 340 Z" fill="#334155"/>
    <rect x="88" y="80" width="4" height="260" fill="#475569"/>
    <circle cx="90" cy="75" r="4" fill="#475569"/>
    {/* Flag (Blue) */}
    <path d="M90 85 C60 110, 110 150, 70 200 C50 230, 90 270, 90 270 L90 85 Z" fill="#0284C7"/>
    <path d="M70 140 C50 170, 90 220, 90 220 L90 140 Z" fill="#0369A1" opacity="0.3"/>

    {/* ----- SCALE OF JUSTICE (Right) ----- */}
    {/* Base & Column */}
    <path d="M260 350 L380 350 L350 320 L290 320 Z" fill="#1E293B"/>
    <path d="M290 320 L350 320 L330 300 L310 300 Z" fill="#0F172A"/>
    {/* Decorative Bulb Base */}
    <ellipse cx="320" cy="300" rx="16" ry="8" fill="#2563EB"/>
    <rect x="306" y="270" width="28" height="30" rx="8" fill="#2563EB"/>
    <ellipse cx="320" cy="270" rx="12" ry="6" fill="#1E3A8A"/>
    <rect x="314" y="150" width="12" height="120" fill="#3B82F6"/>
    {/* Top mechanism */}
    <circle cx="320" cy="148" r="10" fill="#2563EB"/>
    <path d="M320 120 L310 140 L330 140 Z" fill="#2563EB"/>
    <circle cx="320" cy="120" r="4" fill="#2563EB"/>
    {/* Scales arms */}
    <path d="M220 170 Q320 140 420 170" fill="none" stroke="#2563EB" strokeWidth="6" strokeLinecap="round"/>
    {/* Chains & Pans (Left) */}
    <line x1="220" y1="170" x2="190" y2="280" stroke="#475569" strokeWidth="2" strokeDasharray="3 3"/>
    <line x1="220" y1="170" x2="250" y2="280" stroke="#475569" strokeWidth="2" strokeDasharray="3 3"/>
    <path d="M190 280 C190 295, 250 295, 250 280 Z" fill="#2563EB"/>
    <ellipse cx="220" cy="280" rx="30" ry="4" fill="#1E3A8A"/>
    {/* Chains & Pans (Right) */}
    <line x1="420" y1="170" x2="390" y2="280" stroke="#475569" strokeWidth="2" strokeDasharray="3 3"/>
    <line x1="420" y1="170" x2="450" y2="280" stroke="#475569" strokeWidth="2" strokeDasharray="3 3"/>
    <path d="M390 280 C390 295, 450 295, 450 280 Z" fill="#2563EB"/>
    <ellipse cx="420" cy="280" rx="30" ry="4" fill="#1E3A8A"/>

    {/* ----- LAWYER FIGURE (Center-Left) ----- */}
    {/* Legs & Shoes */}
    <rect x="135" y="290" width="12" height="50" fill="#1E293B"/>
    <rect x="165" y="290" width="12" height="50" fill="#1E293B"/>
    <path d="M130 350 L145 350 L145 340 L135 340 C130 340, 130 350, 130 350 Z" fill="#0F172A"/>
    <path d="M165 340 L175 340 C180 340, 180 350, 180 350 L165 350 Z" fill="#0F172A"/>
    
    {/* Robe Back */}
    <path d="M125 150 L185 150 L195 300 L120 300 Z" fill="#0F172A"/>
    
    {/* White Shirt / Collar */}
    <path d="M140 120 L170 120 L175 140 L135 140 Z" fill="white"/>
    <rect x="145" y="140" width="20" height="30" fill="#DBEAFE"/>
    
    {/* Robe Shoulders/Front */}
    <path d="M110 130 C150 110, 200 130, 200 150 L195 290 L115 290 L110 150 Z" fill="#1E293B"/>
    
    {/* Blue Stoles / Sash */}
    <rect x="135" y="140" width="12" height="150" fill="#2563EB"/>
    <rect x="165" y="140" width="12" height="150" fill="#2563EB"/>

    {/* Left Arm (Holding Gavel) */}
    <path d="M185 140 C200 150, 230 180, 210 190" fill="none" stroke="#1E293B" strokeWidth="20" strokeLinecap="round"/>
    <path d="M195 185 L215 180" fill="none" stroke="#FDBA74" strokeWidth="8" strokeLinecap="round"/>
    
    {/* Gavel */}
    <g transform="translate(220, 155) rotate(20)">
      <rect x="0" y="0" width="10" height="20" fill="#2563EB" />
      <rect x="-5" y="-5" width="20" height="6" fill="#3B82F6" />
      <rect x="-5" y="19" width="20" height="6" fill="#3B82F6" />
    </g>
    <line x1="210" y1="185" x2="228" y2="160" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"/>

    {/* Head & Neck */}
    <rect x="145" y="110" width="20" height="15" fill="#FDBA74"/>
    <ellipse cx="155" cy="100" rx="16" ry="20" fill="#FDBA74"/>
    <path d="M140 95 C140 80, 170 80, 170 95 L170 100 L165 105 L155 90 L140 95 Z" fill="#334155"/>
    
    {/* Glasses */}
    <ellipse cx="148" cy="100" rx="4" ry="4" fill="none" stroke="#334155" strokeWidth="1.5"/>
    <ellipse cx="162" cy="100" rx="4" ry="4" fill="none" stroke="#334155" strokeWidth="1.5"/>
    <line x1="152" y1="100" x2="158" y2="100" stroke="#334155" strokeWidth="1.5"/>
    <line x1="138" y1="98" x2="144" y2="100" stroke="#334155" strokeWidth="1.5"/>

    {/* Right Arm (Thinking/On Chin) */}
    <path d="M125 140 C110 150, 110 180, 130 190 L145 150" fill="none" stroke="#1E293B" strokeWidth="16" strokeLinecap="round"/>
    <circle cx="150" cy="120" r="6" fill="#FDBA74"/>
    <path d="M145 150 L150 120" fill="none" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round"/>

  </svg>
);

const ProductivityIllustration = () => (
  <svg viewBox="0 0 520 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
    <defs>
      <linearGradient id="pg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#EFF6FF"/><stop offset="100%" stopColor="#DBEAFE"/></linearGradient>
      <linearGradient id="pg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient>
    </defs>
    <rect width="520" height="380" rx="24" fill="url(#pg1)"/>
    {/* Board frame */}
    <rect x="30" y="30" width="460" height="320" rx="16" fill="white" stroke="#BFDBFE" strokeWidth="1.5"/>
    {/* Header bar */}
    <rect x="30" y="30" width="460" height="42" rx="16" fill="#1E3A8A"/>
    <rect x="30" y="56" width="460" height="16" fill="#1E3A8A"/>
    <circle cx="60" cy="51" r="5" fill="#EF4444" opacity="0.8"/><circle cx="78" cy="51" r="5" fill="#F59E0B" opacity="0.8"/><circle cx="96" cy="51" r="5" fill="#10B981" opacity="0.8"/>
    {/* 3 Column headers */}
    <rect x="48" y="82" width="132" height="22" rx="6" fill="#DBEAFE"/>
    <text x="114" y="97" textAnchor="middle" fill="#1E3A8A" fontSize="11" fontWeight="700" fontFamily="Cairo">مُنجز ✓</text>
    <rect x="194" y="82" width="132" height="22" rx="6" fill="#FEF3C7"/>
    <text x="260" y="97" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="700" fontFamily="Cairo">قيد التنفيذ</text>
    <rect x="340" y="82" width="132" height="22" rx="6" fill="#F1F5F9"/>
    <text x="406" y="97" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700" fontFamily="Cairo">المهام الجديدة</text>
    {/* Done column cards */}
    <rect x="52" y="114" width="124" height="54" rx="10" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1"/>
    <rect x="64" y="126" width="56" height="6" rx="3" fill="#6EE7B7"/><rect x="64" y="138" width="78" height="5" rx="2.5" fill="#D1FAE5"/>
    <path d="M158 132 l4 4 l8-8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="52" y="176" width="124" height="54" rx="10" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1"/>
    <rect x="64" y="188" width="66" height="6" rx="3" fill="#6EE7B7"/><rect x="64" y="200" width="50" height="5" rx="2.5" fill="#D1FAE5"/>
    <path d="M158 194 l4 4 l8-8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="52" y="238" width="124" height="54" rx="10" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1"/>
    <rect x="64" y="250" width="48" height="6" rx="3" fill="#6EE7B7"/><rect x="64" y="262" width="70" height="5" rx="2.5" fill="#D1FAE5"/>
    <path d="M158 256 l4 4 l8-8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* In-progress cards */}
    <rect x="198" y="114" width="124" height="54" rx="10" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1"/>
    <rect x="210" y="126" width="60" height="6" rx="3" fill="#FCD34D"/><rect x="210" y="138" width="80" height="5" rx="2.5" fill="#FEF3C7"/>
    <rect x="198" y="176" width="124" height="54" rx="10" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1"/>
    <rect x="210" y="188" width="72" height="6" rx="3" fill="#FCD34D"/><rect x="210" y="200" width="56" height="5" rx="2.5" fill="#FEF3C7"/>
    {/* New tasks cards */}
    <rect x="344" y="114" width="124" height="54" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1"/>
    <rect x="356" y="126" width="64" height="6" rx="3" fill="#CBD5E1"/><rect x="356" y="138" width="82" height="5" rx="2.5" fill="#F1F5F9"/>
    <rect x="344" y="176" width="124" height="54" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1"/>
    <rect x="356" y="188" width="52" height="6" rx="3" fill="#CBD5E1"/><rect x="356" y="200" width="70" height="5" rx="2.5" fill="#F1F5F9"/>
    <rect x="344" y="238" width="124" height="54" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1"/>
    <rect x="356" y="250" width="74" height="6" rx="3" fill="#CBD5E1"/><rect x="356" y="262" width="58" height="5" rx="2.5" fill="#F1F5F9"/>
    {/* Stats bar at bottom */}
    <rect x="52" y="310" width="140" height="26" rx="13" fill="#DBEAFE" stroke="#BFDBFE" strokeWidth="1"/>
    <circle cx="68" cy="323" r="7" fill="#2563EB"/><text x="68" y="327" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">3</text>
    <rect x="82" y="319" width="24" height="8" rx="4" fill="#2563EB" opacity="0.2"/>
    <rect x="200" y="310" width="140" height="26" rx="13" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="1"/>
    <circle cx="216" cy="323" r="7" fill="#F59E0B"/><text x="216" y="327" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">2</text>
    <rect x="230" y="319" width="24" height="8" rx="4" fill="#F59E0B" opacity="0.2"/>
    <rect x="348" y="310" width="120" height="26" rx="13" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1"/>
    <circle cx="364" cy="323" r="7" fill="#94A3B8"/><text x="364" y="327" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">3</text>
    <rect x="378" y="319" width="24" height="8" rx="4" fill="#94A3B8" opacity="0.2"/>
  </svg>
);

const TeamIllustration = () => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }} dir="ltr">
    <defs>
      <linearGradient id="tmBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F8FAFC"/><stop offset="100%" stopColor="#EFF6FF"/></linearGradient>
      <linearGradient id="tmPrimary" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1E3A8A"/><stop offset="100%" stopColor="#2563EB"/></linearGradient>
      <filter id="tmShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.06"/>
      </filter>
      <filter id="tmFloat" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0F172A" floodOpacity="0.1"/>
      </filter>
    </defs>
    
    <rect width="500" height="400" rx="24" fill="url(#tmBg)"/>

    {/* Backdrop / Abstract elements */}
    <circle cx="250" cy="200" r="180" stroke="#DBEAFE" strokeWidth="1" strokeDasharray="8 8" fill="none"/>

    {/* Main Application Window */}
    <g filter="url(#tmShadow)">
      <rect x="30" y="35" width="440" height="330" rx="16" fill="white" stroke="#BFDBFE" strokeWidth="1.5"/>
      {/* Header = الحساب الأساسي */}
      <rect x="30" y="35" width="440" height="54" rx="16" fill="url(#tmPrimary)"/>
      <rect x="30" y="69" width="440" height="20" fill="url(#tmPrimary)"/>
      
      {/* UI Dots */}
      <circle cx="55" cy="62" r="4" fill="#EF4444"/>
      <circle cx="70" cy="62" r="4" fill="#F59E0B"/>
      <circle cx="85" cy="62" r="4" fill="#10B981"/>
      
      <circle cx="250" cy="50" r="14" fill="#60A5FA" opacity="0.3"/>
      {/* Mini user icon */}
      <circle cx="250" cy="46" r="4" fill="white"/>
      <path d="M244 56 C244 53 256 53 256 56 L256 58 L244 58 Z" fill="white"/>
      
      <text x="250" y="73" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Cairo">الحساب الأساسي (مركزية القيادة)</text>
    </g>

    {/* Right Sidebar: Dynamic Permissions (إدارة ديناميكية للصلاحيات) */}
    <rect x="325" y="105" width="130" height="230" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1"/>
    <text x="390" y="130" textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="800" fontFamily="Cairo">الصلاحيات والأدوار</text>
    <path d="M335 140 L445 140" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>
    
    {/* Role 1: Lawyer */}
    <rect x="335" y="150" width="110" height="34" rx="8" fill="white" stroke="#E2E8F0"/>
    <text x="435" y="171" textAnchor="end" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Cairo">محامي</text>
    <rect x="345" y="160" width="24" height="14" rx="7" fill="#10B981"/>
    <circle cx="362" cy="167" r="5" fill="white"/>

    {/* Role 2: Admin */}
    <rect x="335" y="192" width="110" height="34" rx="8" fill="white" stroke="#E2E8F0"/>
    <text x="435" y="213" textAnchor="end" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Cairo">إداري</text>
    <rect x="345" y="202" width="24" height="14" rx="7" fill="#3B82F6"/>
    <circle cx="362" cy="209" r="5" fill="white"/>

    {/* Role 3: Trainee (Off) */}
    <rect x="335" y="234" width="110" height="34" rx="8" fill="white" stroke="#E2E8F0"/>
    <text x="435" y="255" textAnchor="end" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Cairo">متدرب</text>
    <rect x="345" y="244" width="24" height="14" rx="7" fill="#CBD5E1"/>
    <circle cx="352" cy="251" r="5" fill="white"/>


    {/* Left Main Area: Sub-accounts & Files */}
    <rect x="45" y="105" width="265" height="135" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1"/>
    <text x="295" y="130" textAnchor="end" fill="#0F172A" fontSize="12" fontWeight="800" fontFamily="Cairo">الحسابات الفرعية المخصصة</text>
    <path d="M60 140 L295 140" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>

    {/* Sub Account 1 (Lawyer -> Case File) */}
    <g transform="translate(55, 148)">
      <rect width="245" height="38" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <circle cx="225" cy="19" r="12" fill="#DBEAFE"/>
      <text x="225" y="23" textAnchor="middle" fill="#1E3A8A" fontSize="10" fontWeight="800">أ</text>
      <text x="205" y="23" textAnchor="end" fill="#0F172A" fontSize="10" fontWeight="700" fontFamily="Cairo">أحمد (محامي)</text>
      
      <rect x="8" y="9" width="85" height="20" rx="6" fill="#ECFDF5"/>
      <path d="M78 13 L78 25 L88 25 L88 17 L84 13 Z M84 13 L84 17 L88 17" fill="#10B981"/>
      <text x="73" y="22" textAnchor="end" fill="#10B981" fontSize="9" fontWeight="800" fontFamily="Cairo">ملف القضية 15</text>
      
      <line x1="100" y1="19" x2="140" y2="19" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3"/>
      <rect x="112" y="11" width="16" height="16" rx="8" fill="white" stroke="#E2E8F0"/>
      <path d="M117 19 C116 19 115 18 115 17 C115 16 116 15 117 15 L118 15 M123 17 C124 17 125 18 125 19 C125 20 124 21 123 21 L122 21 M117 18 L122 18" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </g>

    {/* Sub Account 2 (Admin -> General Archive) */}
    <g transform="translate(55, 192)">
      <rect width="245" height="38" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <circle cx="225" cy="19" r="12" fill="#FEF3C7"/>
      <text x="225" y="23" textAnchor="middle" fill="#92400E" fontSize="10" fontWeight="800">س</text>
      <text x="205" y="23" textAnchor="end" fill="#0F172A" fontSize="10" fontWeight="700" fontFamily="Cairo">سارة (إداري)</text>
      
      <rect x="8" y="9" width="85" height="20" rx="6" fill="#EFF6FF"/>
      <path d="M78 13 L78 25 L88 25 L88 17 L84 13 Z M84 13 L84 17 L88 17" fill="#3B82F6"/>
      <text x="73" y="22" textAnchor="end" fill="#3B82F6" fontSize="9" fontWeight="800" fontFamily="Cairo">الأرشيف العام</text>
      
      <line x1="100" y1="19" x2="140" y2="19" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3"/>
      <rect x="112" y="11" width="16" height="16" rx="8" fill="white" stroke="#E2E8F0"/>
      <path d="M117 19 C116 19 115 18 115 17 C115 16 116 15 117 15 L118 15 M123 17 C124 17 125 18 125 19 C125 20 124 21 123 21 L122 21 M117 18 L122 18" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </g>


    {/* Bottom Floating Panel: Performance Tracking (تقييم ومتابعة فورية) */}
    <g filter="url(#tmFloat)" transform="translate(45, 255)">
      <rect width="265" height="85" rx="14" fill="white" stroke="#BFDBFE" strokeWidth="1.5"/>
      <text x="245" y="25" textAnchor="end" fill="#1E3A8A" fontSize="12" fontWeight="800" fontFamily="Cairo">تقييم ومتابعة الإنجاز الفوري</text>
      
      {/* Progress Bar 1 */}
      <text x="245" y="47" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" fontFamily="Cairo">أحمد</text>
      <rect x="15" y="41" width="190" height="6" rx="3" fill="#F1F5F9"/>
      <rect x="15" y="41" width="160" height="6" rx="3" fill="#10B981"/>
      <text x="200" y="47" textAnchor="start" fill="#10B981" fontSize="10" fontWeight="800">85%</text>

      {/* Progress Bar 2 */}
      <text x="245" y="67" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" fontFamily="Cairo">سارة</text>
      <rect x="15" y="61" width="190" height="6" rx="3" fill="#F1F5F9"/>
      <rect x="15" y="61" width="110" height="6" rx="3" fill="#3B82F6"/>
      <text x="155" y="67" textAnchor="start" fill="#3B82F6" fontSize="10" fontWeight="800">60%</text>
    </g>

  </svg>
);

const NotificationsIllustration = () => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }} dir="ltr">
    <defs>
      <linearGradient id="bgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F8FAFC"/><stop offset="100%" stopColor="#EFF6FF"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2563EB"/><stop offset="100%" stopColor="#1E3A8A"/></linearGradient>
      <filter id="shadowNT" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0F172A" floodOpacity="0.08"/>
      </filter>
    </defs>
    <rect width="500" height="400" rx="24" fill="url(#bgG)"/>
    
    {/* Abstract background circles for a modern radar/sync feel */}
    <circle cx="250" cy="200" r="160" stroke="#DBEAFE" strokeWidth="2" strokeDasharray="12 12" fill="none"/>
    <circle cx="250" cy="200" r="110" stroke="#BFDBFE" strokeWidth="1.5" fill="none"/>
    <circle cx="250" cy="200" r="220" stroke="#EFF6FF" strokeWidth="4" fill="none"/>

    {/* Central Element: Sleek Calendar/Clock Hybrid */}
    <g filter="url(#shadowNT)">
      <rect x="180" y="110" width="140" height="150" rx="28" fill="white"/>
      <rect x="180" y="110" width="140" height="44" rx="28" fill="url(#accent)"/>
      <rect x="180" y="132" width="140" height="22" fill="url(#accent)"/>
      <circle cx="250" cy="110" r="18" fill="white" filter="url(#shadowNT)"/>
      <path d="M244 104 L250 116 L259 101" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      <text x="250" y="142" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="Cairo">15 مارس 2026</text>
      
      {/* Time display */}
      <text x="250" y="210" textAnchor="middle" fill="#1E3A8A" fontSize="42" fontWeight="900" fontFamily="sans-serif">10:00</text>
      <text x="250" y="240" textAnchor="middle" fill="#64748B" fontSize="14" fontWeight="700" fontFamily="Cairo">صباحاً</text>
      
      {/* Decorative dots framing the time */}
      <circle cx="205" cy="184" r="3" fill="#E2E8F0"/>
      <circle cx="295" cy="184" r="3" fill="#E2E8F0"/>
      <circle cx="205" cy="226" r="3" fill="#E2E8F0"/>
      <circle cx="295" cy="226" r="3" fill="#E2E8F0"/>
    </g>

    {/* Floating Card 1: Top Right (Google Sync) */}
    <g filter="url(#shadowNT)" transform="translate(310, 35)">
      <rect width="165" height="60" rx="18" fill="white"/>
      <circle cx="132" cy="30" r="15" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5"/>
      <text x="132" y="35" textAnchor="middle" fill="#4285F4" fontSize="14" fontWeight="800">G</text>
      <text x="106" y="28" textAnchor="end" fill="#1E3A8A" fontSize="12" fontWeight="800" fontFamily="Cairo">مزامنة تامة</text>
      <text x="106" y="46" textAnchor="end" fill="#64748B" fontSize="11" fontWeight="600" fontFamily="Cairo">مع مفكرة جوجل</text>
    </g>

    {/* Floating Card 2: Left Middle (Proactive Alert) */}
    <g filter="url(#shadowNT)" transform="translate(20, 155)">
      <rect width="180" height="68" rx="20" fill="white"/>
      <rect x="160" y="14" width="5" height="40" rx="2.5" fill="#EF4444"/>
      <circle cx="130" cy="34" r="16" fill="#FEE2E2"/>
      <path d="M130 25 C130 25 125 28 125 33 L125 38 L122 41 L122 42 L138 42 L138 41 L135 38 L135 33 C135 28 130 25 130 25 Z" fill="#EF4444"/>
      <circle cx="130" cy="45" r="2" fill="#EF4444"/>
      
      <text x="102" y="32" textAnchor="end" fill="#0F172A" fontSize="14" fontWeight="900" fontFamily="Cairo">تنبيه استباقي</text>
      <text x="102" y="52" textAnchor="end" fill="#64748B" fontSize="11" fontWeight="600" fontFamily="Cairo">جلسة مرافعة غداً</text>
    </g>

    {/* Floating Card 3: Bottom Right (Smart Scheduling) */}
    <g filter="url(#shadowNT)" transform="translate(300, 275)">
      <rect width="170" height="64" rx="20" fill="white"/>
      <circle cx="138" cy="32" r="16" fill="#DBEAFE"/>
      <rect x="132" y="25" width="12" height="14" rx="2" stroke="#2563EB" strokeWidth="2" fill="none"/>
      <line x1="135" y1="30" x2="141" y2="30" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
      <line x1="135" y1="34" x2="139" y2="34" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
      
      <text x="110" y="30" textAnchor="end" fill="#0F172A" fontSize="13" fontWeight="900" fontFamily="Cairo">جدولة ذكية</text>
      <text x="110" y="48" textAnchor="end" fill="#64748B" fontSize="11" fontWeight="600" fontFamily="Cairo">تنظيم المهام الروتينية</text>
    </g>
    
    {/* Dynamic Connecting Lines bridging the objects */}
    <path d="M380 95 L340 145" stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 6" fill="none"/>
    <path d="M200 189 L180 189" stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 6" fill="none"/>
    <path d="M380 275 L330 230" stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 6" fill="none"/>

  </svg>
);

/* ─── Feature Section Component ─── */
const FeatureSection = ({ 
  id, badge, title, description, bullets, imageSrc, imageAlt, 
  reversed, bgColor = 'white', ctaText, ctaHref,
  iconForFallback, customIllustration: CustomIllustration
}) => {
  const [sectionRef, isVisible] = useInView(0.1);
  const Icon = iconForFallback;

  return (
    <section
      id={id}
      ref={sectionRef}
      style={{
        padding: 'clamp(20px, 4vw, 50px) 0',
        background: bgColor,
        overflow: 'hidden'
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0'
      }}>
        <div className={`feature-row ${reversed ? 'feature-row-reversed' : ''}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(40px, 6vw, 80px)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Text Content */}
          <div className="feature-text-col" style={{ flex: 1, minWidth: 0 }}>
            {badge && (
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                color: '#2563EB',
                fontSize: '14px',
                fontWeight: '700',
                padding: '6px 18px',
                borderRadius: '99px',
                marginBottom: '16px',
                fontFamily: "'Cairo', sans-serif",
                border: '1px solid #BFDBFE'
              }}>
                {badge}
              </span>
            )}
            <h2 style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: 'clamp(28px, 3.5vw, 42px)',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: '1.25',
              marginBottom: '16px'
            }}>
              {title}
            </h2>
            <p style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              color: '#64748b',
              lineHeight: '1.8',
              marginBottom: '28px',
              fontWeight: '500'
            }}>
              {description}
            </p>
            {/* Bullet Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {bullets.map((bullet, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + idx * 0.08}s`,
                }}>
                  <div style={{
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                  }}>
                    <Check size={14} color="white" strokeWidth={3} />
                  </div>
                  <span style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '15px',
                    color: '#334155',
                    fontWeight: '600',
                    lineHeight: '1.6'
                  }}>
                    {bullet}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            {ctaText && (
              <div style={{ marginTop: '32px' }}>
                <Link href={ctaHref || '/pricing'}>
                  <a style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    color: 'white',
                    padding: '14px 32px',
                    borderRadius: '12px',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '16px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
                    }}
                  >
                    {ctaText}
                    <ArrowLeft size={18} />
                  </a>
                </Link>
              </div>
            )}
          </div>

          {/* Image / Illustration */}
          <div className="feature-image-col" style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: CustomIllustration ? '0' : '20px',
              overflow: CustomIllustration ? 'visible' : 'hidden',
              position: 'relative'
            }}>
              {CustomIllustration ? (
                <CustomIllustration />
              ) : (
                <>
                  <img
                    src={imageSrc}
                    alt={imageAlt}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: '20px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback */}
                  <div style={{
                    display: 'none',
                    width: '100%',
                    aspectRatio: '4/3',
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    borderRadius: '20px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #BFDBFE'
                  }}>
                    {Icon && <Icon size={80} color="#3B82F6" strokeWidth={1} />}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Hero Section with 6 icon-highlights ─── */
const HeroHighlight = ({ icon: Icon, text, delay }) => {
  const [ref, vis] = useInView(0.1);
  return (
    <div ref={ref} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      padding: '10px 20px',
      borderRadius: '12px',
      border: '1px solid rgba(37, 99, 235, 0.15)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} color="white" />
      </div>
      <span style={{
        fontFamily: "'Cairo', sans-serif",
        fontSize: '14px',
        fontWeight: '700',
        color: '#1e293b',
        whiteSpace: 'nowrap'
      }}>
        {text}
      </span>
    </div>
  );
};

/* ─── Main Features Page ─── */
const FeaturesPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.background = 'white';
    document.body.style.fontFamily = "'Cairo', sans-serif";
    return () => { document.body.style.background = ''; document.body.style.fontFamily = ''; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
  }, [mobileMenuOpen]);

  const handleGetStarted = () => router.push('/register');
  const handleLogin = () => router.push('/login');

  if (!mounted) return null;

  const heroHighlights = [
    { icon: Scale, text: 'متابعة الدعاوي بدقة متناهية' },
    { icon: Users, text: 'قاعدة بيانات متكاملة للعملاء والتوكيلات' },
    { icon: FileText, text: 'توليد تلقائي للمستندات لتسريع الإجراءات' },
    { icon: BarChart3, text: 'لوحات تقارير مالية وإحصائية فورية' },
    { icon: CalendarClock, text: 'جدولة ذكية للمواعيد وجلسات المحاكم' },
    { icon: Shield, text: 'نظام أذونات دقيق لفريق العمل' },
  ];

  /* Feature sections data */
  const featureSections = [
    {
      id: 'case-management',
      badge: 'إدارة القضايا',
      title: 'بناء ملف قضائي نموذجي',
      description: 'أضابير منظمة ومستعدة تماماً للمحاكمة. اجمع كافة خيوط وتفاصيل دعواك في منصة مركزية واحدة، لتضمن الدقة والاحترافية.',
      bullets: [
        'شمولية لجميع الفروع القانونية (التحقيق، الجنح، الجنايات، البداءة، الأحوال الشخصية)',
        'إلمام بكافة متطلبات القضية في شاشة واحدة',
        'ربط ذكي بين أطراف الدعوى، المحامين المكلفين، والمرفقات',
        'مراقبة دقيقة لمسار الدعوى وتطوراتها',
        'توثيق زمني شامل لكل إجراء أو تحديث'
      ],
      imageSrc: '/images/features/case_management.png',
      imageAlt: 'إدارة القضايا والملفات القانونية',
      reversed: false,
      bgColor: 'white',
      iconForFallback: FolderOpen
    },
    {
      id: 'expert-built',
      badge: 'صُنع بأيدي خبراء القانون',
      title: <>صُمم بعقلية وخبرة المحامي{'\n'}ليحقق تطلعاتك</>,
      description: 'برمجيات صُممت خصيصاً لتلبي احتياجات المحامي العراقي، لتقدم تجربة تقنية ذكية، دقيقة، وخالية من التعقيد.',
      bullets: [
        'جدول أسبوعي تفاعلي للجلسات (لوحة قيادة شاملة)',
        'تقنية بحث عميق للوصول السريع للمعلومات',
        'مستودع جاهز للصيغ القانونية المعتمدة',
        'شاشة موحدة لمراقبة حالة القضايا والموقف المالي',
        'رصد دقيق لتسلسل الإجراءات والقرارات القضائية'
      ],
      imageSrc: '/images/features/legal_experts.png',
      imageAlt: 'صُنع بأيدي خبراء القانون',
      reversed: true,
      bgColor: '#f8fafc',
      iconForFallback: Gavel,
    },
    {
      id: 'financial',
      badge: 'المحاسبة لمكاتب المحاماة',
      title: <>النظام المالي المتكامل{'\n'}للمحامين</>,
      description: 'ضبط مالي صارم، وإصدار فواتير سلس يمنحك شفافية تامة وقدرة أعلى على إدارة الموارد.',
      bullets: [
        'تتبع دقيق لأتعاب المحاماة (المسددة والمتبقية)',
        'إصدار آلي للسندات والفواتير',
        'فصل مالي دقيق لكل دعوى على حدة',
        'تسجيل وحساب المصروفات والنفقات بوضوح',
        'استخراج كشوفات حسابية شاملة بنقرة واحدة'
      ],
      imageSrc: '/images/features/financial_system.png',
      imageAlt: 'النظام المالي المتكامل',
      reversed: false,
      bgColor: 'white',
      iconForFallback: Wallet
    },
    {
      id: 'notifications',
      badge: 'لا تفوّت أي اجتماع أو جلسة',
      title: <>حضور دائم{'\n'}في الوقت المناسب</>,
      description: 'نظام إشعارات وقائي. كن دائماً في قلب الحدث عبر تقويم تفاعلي يحميك من تفويت أي موعد حاسم أمام القضاء.',
      bullets: [
        'تنبيهات استباقية يومية',
        'رسائل تذكير بمواعيد المرافعات القادمة',
        'جدولة ذكية للمهام الروتينية',
        'مزامنة تامة مع مفكرة جوجل (Google Calendar)',
        'استعراض مرن للجدول الزمني (بشكل يومي، أسبوعي، أو شهري)'
      ],
      imageSrc: '/images/features/notifications_calendar.png',
      imageAlt: 'تنبيهات وإشعارات ذكية',
      reversed: true,
      bgColor: '#f8fafc',
      iconForFallback: BellRing
    },
    {
      id: 'documents',
      badge: 'أتمتة المستندات',
      title: <>الصياغة الآلية{'\n'}للمستندات القانونية</>,
      description: 'تخلص من عبء الكتابة الروتينية وضع حداً لهدر الوقت. تقنية ذكية تستخلص بيانات الموكلين وتفاصيل القضايا لتوليد المستندات فورياً.',
      bullets: [
        'تحضير تلقائي للوكالات، العقود، واللوائح',
        'محرر نصوص احترافي متوافق كلياً مع اللغة العربية',
        'حفظ الوثائق بصيغ متعددة (Word و PDF)',
        'مكتبة نماذج مرنة تقبل التعديل والحفظ',
        'خزانة رقمية مشفرة لمستندات كل عميل'
      ],
      imageSrc: '/images/features/document_automation.png',
      imageAlt: 'الصياغة الآلية للمستندات القانونية',
      reversed: false,
      bgColor: 'white',
      iconForFallback: FileEdit
    },
    {
      id: 'cloud',
      badge: 'مكتبك المتنقل',
      title: <>بياناتك الموثوقة بين يديك{'\n'}في أي وقت ومكان</>,
      description: 'نفاذ سحابي مشفر بلا حدود. تطبيق معتمد على أحدث الخوادم السحابية، يمنحك حرية الوصول إلى بياناتك من أي مكان وزمان.',
      bullets: [
        'بيئة استضافة سحابية فائقة الحماية',
        'سرية تامة ومضمونة لمعلومات الموكلين',
        'استجابة سريعة وتوافق مع كافة الأجهزة (هواتف ذكية، أجهزة لوحية، حواسيب)',
        'أخذ نسخ احتياطية للبيانات بشكل دوري وتلقائي'
      ],
      imageSrc: '/images/features/cloud_security.png',
      imageAlt: 'مكتبك القانوني المتنقل',
      reversed: true,
      bgColor: '#f8fafc',
      ctaText: 'ابدأ بالتجربة',
      ctaHref: '/register',
      iconForFallback: CloudCog
    },
    {
      id: 'productivity',
      badge: 'تحكّم يومك من خلال المهام اليومية',
      title: <>ارتقِ بإنتاجيتك اليومية{'\n'}وأنجز مهامك بكفاءة</>,
      description: 'إدارة فائقة للإنتاجية اليومية. اجعل من مهامك الروتينية خطوات نحو النجاح. أداة "محامي برو" تتيح لك ترتيب يومك بفعالية لضمان عدم إغفال أي التزام، سواء كان اتصالاً بعميل أو إجراءً إدارياً.',
      bullets: [
        'فرز وتحديد الأولويات القصوى لليوم',
        'توزيع شفاف وواضح للمسؤوليات بين أفراد الطاقم',
        'مراقبة حية للمهام المرتبطة بكل قضية',
        'ضمان تحقيق الأهداف المهنية اليومية',
        'تنظيم بيئة العمل وتقليص التشتت الإداري'
      ],
      imageSrc: '/images/features/task_management.png',
      imageAlt: 'إدارة الإنتاجية اليومية',
      reversed: false,
      bgColor: 'white',
      iconForFallback: Target,
      customIllustration: ProductivityIllustration
    },
    {
      id: 'teams',
      badge: 'إدارة متقدمة وحلول مؤسسية',
      title: <>منصة شاملة لإدارة{'\n'}الطواقم القانونية</>,
      description: 'حلول متقدمة للكيانات والمكاتب الكبرى. قم بضم المحامين، هيكلة المستخدمين، وإسناد الواجبات بانسيابية لضمان سيطرة تامة على سير العمل الداخلي.',
      bullets: [
        'إمكانية ضم محامين وإداريين للحساب الأساسي',
        'تخصيص حسابات فرعية وربطها بملفات محددة',
        'إدارة ديناميكية للصلاحيات (أدوار: مدير، محامي، إداري)',
        'تقييم ومتابعة فورية لمستوى إنجاز أفراد الفريق',
        'مركزية في القيادة تسهل عملية اتخاذ القرارات الحاسمة'
      ],
      imageSrc: '/images/features/team_management.png',
      imageAlt: 'إدارة الطواقم القانونية',
      reversed: true,
      bgColor: '#f8fafc',
      iconForFallback: UserCog
    },
  ];

  return (
    <>
      <Head>
        <title>المميزات | محامي برو - منظومة قانونية رقمية شاملة</title>
        <meta name="description" content="اكتشف مميزات محامي برو: إدارة القضايا، المحاسبة القانونية، أتمتة المستندات، جدولة الجلسات، وإدارة الطواقم. منظومة قانونية رقمية شاملة للمحامي العراقي." />
        <meta name="keywords" content="مميزات محامي برو, إدارة القضايا, محاسبة مكاتب المحاماة, أتمتة المستندات القانونية, جدولة الجلسات, إدارة الطواقم القانونية" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
        <link rel="canonical" href="https://mohamipro.com/features" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mohamipro.com/features" />
        <meta property="og:title" content="المميزات | محامي برو - منظومة قانونية رقمية شاملة" />
        <meta property="og:description" content="اكتشف مميزات محامي برو: إدارة القضايا، المحاسبة القانونية، أتمتة المستندات، جدولة الجلسات، وإدارة الطواقم." />
        <meta property="og:image" content="https://mohamipro.com/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', sans-serif; background: white; }

        .features-page { min-height: 100vh; background: white; direction: rtl; }

        /* Glass Header */
        .glass-header {
          background: #ffffff;
          border-bottom: 1px solid #E2E8F0;
        }

        /* Feature Row Responsive */
        .feature-row {
          flex-direction: row;
        }
        .feature-row-reversed {
          flex-direction: row-reverse;
        }

        /* CTA Section */
        .cta-section-gradient {
          background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%);
          position: relative;
          overflow: hidden;
        }
        .cta-section-gradient::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -25%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-section-gradient::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -15%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Final Section */
        .final-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        /* Mobile Breakpoints */
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .header-actions { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .feature-row,
          .feature-row-reversed {
            flex-direction: column !important;
          }
          .feature-text-col { text-align: center !important; }
          .feature-image-col { order: -1 !important; }
          .final-features-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .final-features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <div className="features-page" dir="rtl">
        {/* ─── Header (same as index) ─── */}
        <header className="glass-header" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '64px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
              <Link href="/">
                <a style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '20px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.2', whiteSpace: 'nowrap' }}>محامي برو</span>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '500', color: '#3B82F6', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                  </div>
                  <Logo height="48px" iconOnly={true} />
                </a>
              </Link>

              <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <Link href="/features">
                  <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#2563EB', textDecoration: 'none', borderBottom: '2px solid #2563EB', paddingBottom: '2px' }}>
                    المميزات
                  </a>
                </Link>
                <Link href="/pricing">
                  <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>
                    الأسعار
                  </a>
                </Link>
                <Link href="/#contact">
                  <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>
                    تواصل معنا
                  </a>
                </Link>
              </nav>

              <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={handleLogin} style={{ fontFamily: "'Cairo', sans-serif", fontSize: '14px', fontWeight: '600', color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}>
                  تسجيل الدخول
                </button>
                <button onClick={handleGetStarted} style={{
                  color: 'white', background: '#2563EB', padding: '10px 24px', borderRadius: '9999px',
                  fontFamily: "'Cairo', sans-serif", fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                  onMouseOver={e => { e.target.style.background = '#1d4ed8'; e.target.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.target.style.background = '#2563EB'; e.target.style.transform = 'translateY(0)'; }}
                >
                  ابدأ مجاناً
                </button>
              </div>

              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} style={{ display: 'none', background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '8px' }}>
                <Menu size={28} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: '#ffffff', zIndex: 9999, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start', paddingTop: '100px',
            gap: '20px', direction: 'rtl', fontFamily: "'Cairo', sans-serif"
          }}>
            <button onClick={() => setMobileMenuOpen(false)} style={{ position: 'absolute', top: '20px', left: '25px', background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: '8px' }}>
              <X size={32} />
            </button>
            <Link href="/features"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#2563EB', textDecoration: 'none', padding: '12px 24px' }}>المميزات</a></Link>
            <Link href="/pricing"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', textDecoration: 'none', padding: '12px 24px' }}>الأسعار</a></Link>
            <Link href="/#contact"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', textDecoration: 'none', padding: '12px 24px' }}>تواصل معنا</a></Link>
            <div style={{ width: '60%', height: '1px', background: '#e2e8f0', margin: '10px 0' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '70%' }}>
              <button onClick={() => { setMobileMenuOpen(false); handleLogin(); }} style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: '#ffffff', fontWeight: '700', fontSize: '16px', fontFamily: "'Cairo', sans-serif", cursor: 'pointer' }}>تسجيل الدخول</button>
              <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} style={{ padding: '14px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '700', fontSize: '16px', fontFamily: "'Cairo', sans-serif", cursor: 'pointer' }}>ابدأ مجاناً</button>
            </div>
          </div>
        )}

        {/* ─── Hero Section ─── */}
        <section style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #1E3A8A 0%, #2563EB 70%, #3B82F6 100%)',
          padding: '80px 0 60px',
          overflow: 'hidden',
          textAlign: 'center'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute', top: '10%', right: '5%', width: '300px', height: '300px',
            borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', left: '10%', width: '200px', height: '200px',
            borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '30%', width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
            <h1 style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: 'clamp(24px, 3.5vw, 40px)',
              fontWeight: '900',
              color: 'white',
              lineHeight: '1.2',
              marginBottom: '20px'
            }}>
              منظومة قانونية رقمية شاملة
            </h1>
            <p style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: 'clamp(14px, 1.3vw, 17px)',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: '1.8',
              maxWidth: '700px',
              margin: '0 auto 40px',
              fontWeight: '500'
            }}>
              سيطرة مطلقة على سير العمل.. أدر أدق تفاصيل دعواك بمهنية عالية وانتقل بمكتبك نحو مستقبل رقمي أكثر تنظيماً وإنتاجية.
            </p>

            {/* Highlights Grid */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px',
              maxWidth: '800px',
              margin: '0 auto 40px'
            }}>
              {heroHighlights.map((h, i) => (
                <HeroHighlight key={i} icon={h.icon} text={h.text} delay={0.1 + i * 0.08} />
              ))}
            </div>

            {/* CTA */}
          </div>
        </section>

        {/* ─── Feature Sections ─── */}
        {featureSections.map((section, idx) => (
          <FeatureSection key={idx} {...section} />
        ))}

        {/* ─── Final CTA Section: Start Your Journey ─── */}
        <section style={{ padding: '80px 0', background: 'white' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                color: '#2563EB',
                fontSize: '14px',
                fontWeight: '700',
                padding: '6px 18px',
                borderRadius: '99px',
                marginBottom: '16px',
                fontFamily: "'Cairo', sans-serif",
                border: '1px solid #BFDBFE'
              }}>
                احصل الآن على أداء أفضل
              </span>
              <h2 style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: 'clamp(28px, 3.5vw, 42px)',
                fontWeight: '900',
                color: '#0f172a',
                lineHeight: '1.3',
                marginBottom: '16px'
              }}>
                ابدأ مسيرتك مع التقنية{' '}
                <span style={{ color: '#2563EB' }}>القانونية الحديثة</span>
              </h2>
              <p style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: '17px',
                color: '#64748b',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.7',
                fontWeight: '500'
              }}>
                الحل البرمجي الأمثل الذي يجمع كل ما يطمح إليه المحامي العراقي للارتقاء بجودة خدماته.
              </p>
            </div>

            {/* Features Grid */}
            <div className="final-features-grid">
              {[
                { icon: Monitor, text: 'واجهة مستخدم انسيابية ومريحة بصرياً' },
                { icon: LayoutDashboard, text: 'شاشة تحكم رئيسية (Dashboard) توفر رؤية شاملة' },
                { icon: Zap, text: 'أداة قوية لتقليص الجهد وتوفير الساعات الطويلة' },
                { icon: Rocket, text: 'نظام جاهز للعمل الفوري دون تعقيدات' },
                { icon: Sparkles, text: 'تطوير مستمر وتحديثات تلقائية' },
                { icon: Headphones, text: 'فريق دعم تقني جاهز لمساعدتك دائماً' }
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '20px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s ease'
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.08)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                    }}>
                      <ItemIcon size={20} color="white" />
                    </div>
                    <span style={{
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#1e293b',
                      lineHeight: '1.5'
                    }}>
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA Banner ─── */}
        <section className="cta-section-gradient" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
            <h2 style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: '900',
              color: 'white',
              marginBottom: '16px',
              lineHeight: '1.3'
            }}>
              انطلق في تجربتك المجانية اليوم
            </h2>
            <p style={{
              fontFamily: "'Cairo', sans-serif",
              fontSize: '17px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '32px',
              lineHeight: '1.7'
            }}>
              جرب محامي برو مجاناً واكتشف كيف يمكن للتقنية أن ترتقي بممارستك القانونية
            </p>
            <button
              onClick={handleGetStarted}
              style={{
                background: 'white',
                color: '#1E3A8A',
                padding: '16px 48px',
                borderRadius: '12px',
                fontFamily: "'Cairo', sans-serif",
                fontSize: '18px',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseOver={e => { e.target.style.transform = 'translateY(-3px) scale(1.02)'; e.target.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'; }}
              onMouseOut={e => { e.target.style.transform = 'translateY(0) scale(1)'; e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            >
              ابدأ تجربتك المجانية
            </button>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer style={{
          background: '#0f172a', color: '#cbd5e1', paddingTop: '64px', paddingBottom: '32px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-150px', right: '-150px', width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)', pointerEvents: 'none'
          }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', marginBottom: '64px' }}>
              {/* Brand */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '24px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1', whiteSpace: 'nowrap' }}>محامي برو</span>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '600', color: '#3B82F6', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                  </div>
                  <div style={{ background: 'white', padding: '6px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Logo height="45px" iconOnly={true} />
                  </div>
                </div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', lineHeight: '1.8', color: '#94a3b8', maxWidth: '300px' }}>
                  نظام إدارة مكاتب المحاماة المتكامل والشامل في العراق. حلول ذكية لتنظيم القضايا والارتقاء بالممارسة القانونية.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { href: 'https://www.facebook.com/profile.php?id=61588419684565', icon: Facebook, hoverBg: '#1877F2' },
                    { href: 'https://www.linkedin.com/company/mohami-pro/?viewAsMember=true', icon: Linkedin, hoverBg: '#0077B5' },
                    { href: 'https://t.me/+7bB9KEMXn3w2OGJi', icon: Send, hoverBg: '#229ED9' },
                    { href: 'mailto:info@mohamipro.com', icon: Mail, hoverBg: '#3B82F6' }
                  ].map((social, i) => {
                    const SocialIcon = social.icon;
                    return (
                      <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" style={{
                        width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ffffff', textDecoration: 'none', transition: 'all 0.3s'
                      }}
                        onMouseOver={e => { e.currentTarget.style.background = social.hoverBg; e.currentTarget.style.borderColor = social.hoverBg; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      >
                        <SocialIcon size={20} />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>روابط سريعة</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px' }}>
                  <Link href="/features"><a style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#3B82F6'} onMouseOut={e => e.target.style.color = '#94a3b8'}>المميزات</a></Link>
                  <Link href="/pricing"><a style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#3B82F6'} onMouseOut={e => e.target.style.color = '#94a3b8'}>الأسعار</a></Link>
                  <Link href="/#contact"><a style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#3B82F6'} onMouseOut={e => e.target.style.color = '#94a3b8'}>تواصل معنا</a></Link>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>تواصل معنا</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                      <Mail size={20} />
                    </div>
                    <a href="mailto:info@mohamipro.com" style={{ color: '#94a3b8', textDecoration: 'none', direction: 'ltr', fontSize: '16px', fontWeight: '500' }}>info@mohamipro.com</a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                      <Phone size={20} />
                    </div>
                    <span style={{ color: '#94a3b8', direction: 'ltr', fontSize: '16px', fontWeight: '500' }}>+964 7XX XXX XXXX</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bottom */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '14px', color: '#64748b' }}>&copy; 2026 محامي برو. جميع الحقوق محفوظة.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.05)', padding: '6px 16px', borderRadius: '99px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}></span>
                <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '13px', color: '#10b981', fontWeight: '600' }}>جميع الأنظمة تعمل بكفاءة</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default FeaturesPage;
