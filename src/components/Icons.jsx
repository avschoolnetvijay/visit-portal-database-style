import React from 'react';

export const Icons = {
  Dashboard: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="52" height="34" rx="4" fill="#339af0" stroke="#fff" strokeWidth="2" />
      <rect x="10" y="12" width="44" height="26" fill="#1c7d7b" rx="2" />
      <rect x="14" y="24" width="6" height="10" fill="#ffd43b" />
      <rect x="22" y="18" width="6" height="16" fill="#51cf66" />
      <rect x="30" y="28" width="6" height="6" fill="#ff6b6b" />
      <path d="M26 42h12v6H26z" fill="#dee2e6" stroke="#495057" strokeWidth="2" />
      <path d="M16 48h32" stroke="#495057" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  Performance: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="6" width="44" height="14" rx="3" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <rect x="10" y="24" width="44" height="14" rx="3" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <rect x="10" y="42" width="44" height="14" rx="3" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <circle cx="16" cy="13" r="2.5" fill="#51cf66" />
      <circle cx="16" cy="31" r="2.5" fill="#51cf66" />
      <circle cx="16" cy="49" r="2.5" fill="#fa5252" />
      <circle cx="23" cy="13" r="2" fill="#ffd43b" />
      <circle cx="23" cy="31" r="2" fill="#ffd43b" />
      <circle cx="23" cy="49" r="2" fill="#ffd43b" />
      <line x1="30" y1="13" x2="48" y2="13" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="31" x2="48" y2="31" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="49" x2="48" y2="49" stroke="#adb5bd" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  School: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="48" height="32" rx="2" fill="#74c0fc" stroke="#228be6" strokeWidth="2" />
      <polygon points="32,4 6,24 58,24" fill="#ff6b6b" stroke="#fa5252" strokeWidth="2" />
      <rect x="26" y="38" width="12" height="18" fill="#ffd43b" stroke="#f59f00" strokeWidth="1.5" />
      <circle cx="32" cy="14" r="3" fill="#ffe066" />
      <path d="M32 28l-8-4 8-4 8 4-8 4z" fill="#343a40" />
      <path d="M28 26v4c0 1.5 1.5 2 4 2s4-.5 4-2v-4" fill="#343a40" />
    </svg>
  ),
  Analytics: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="52" height="34" rx="4" fill="#339af0" stroke="#fff" strokeWidth="2" />
      <rect x="10" y="14" width="44" height="26" rx="2" fill="#f8f9fa" />
      <path d="M2 48h60l-4 6H6l-4-6z" fill="#ced4da" stroke="#495057" strokeWidth="2" />
      <line x1="28" y1="51" x2="36" y2="51" stroke="#868e96" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="27" r="5" fill="#fcc419" stroke="#fab005" strokeWidth="1.5" />
      <circle cx="37" cy="23" r="4" fill="#51cf66" stroke="#37b24d" strokeWidth="1.5" />
    </svg>
  ),
  Alert: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 6L4 54h56L32 6z" fill="#ffd43b" stroke="#fab005" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 18v18" stroke="#343a40" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="45" r="3.5" fill="#343a40" />
    </svg>
  ),
  Reports: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#20c997" stroke="#fff" strokeWidth="2" />
      <path d="M12 20l8 8 16-16" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Setup: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="14" fill="#ffd43b" stroke="#f59f00" strokeWidth="2" />
      <circle cx="32" cy="32" r="6" fill="#fff" />
      <path d="M32 10v8M32 46v8M10 32h8M46 32h8M16 16l6 6M42 42l6 6M16 48l6-6M42 16l6-6" stroke="#f59f00" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,8 20,26 20,42 28,42 28,26 44,8" fill="#ff922b" stroke="#fff" strokeWidth="2.5" />
      <line x1="8" y1="12" x2="40" y2="12" stroke="#fff" strokeWidth="2" />
    </svg>
  ),
  Export: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 30v8a4 4 0 004 4h28a4 4 0 004-4v-8" stroke="#339af0" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 6v22M14 18l10 10 10-10" stroke="#ff922b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plan: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="32" height="34" rx="3" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <rect x="18" y="4" width="12" height="8" rx="2" fill="#ffd43b" stroke="#fab005" strokeWidth="1.5" />
      <path d="M14 20l4 4 14-14" stroke="#51cf66" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="28" x2="32" y2="28" stroke="#ced4da" strokeWidth="2" />
      <line x1="16" y1="34" x2="28" y2="34" stroke="#ced4da" strokeWidth="2" />
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ff6b6b" stroke="#fff" strokeWidth="2" />
      <path d="M24 14v10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M17 18.5a10 10 0 1014 0" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  ),
  Users: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="24" r="7" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <path d="M10 44c0-5 4-8 10-8s10 3 10 8" fill="#ff6b6b" stroke="#fa5252" strokeWidth="1.5" />
      <circle cx="44" cy="24" r="7" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <path d="M34 44c0-5 4-8 10-8s10 3 10 8" fill="#51cf66" stroke="#37b24d" strokeWidth="1.5" />
      <circle cx="32" cy="20" r="8" fill="#ffd43b" stroke="#f59f00" strokeWidth="1.5" />
      <path d="M20 42c0-6 5.373-10 12-10s12 4 12 10" fill="#339af0" stroke="#228be6" strokeWidth="1.5" />
    </svg>
  ),
  SchoolSolid: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="48" height="32" rx="2" fill="#74c0fc" stroke="#228be6" strokeWidth="2" />
      <polygon points="32,4 6,24 58,24" fill="#ff6b6b" stroke="#fa5252" strokeWidth="2" />
      <rect x="26" y="38" width="12" height="18" fill="#ffd43b" stroke="#f59f00" strokeWidth="1.5" />
      <circle cx="32" cy="14" r="3" fill="#ffe066" />
      <path d="M32 28l-8-4 8-4 8 4-8 4z" fill="#343a40" />
      <path d="M28 26v4c0 1.5 1.5 2 4 2s4-.5 4-2v-4" fill="#343a40" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="12" fill="#e7f5ff" stroke="#339af0" strokeWidth="3" />
      <line x1="28" y1="28" x2="42" y2="42" stroke="#495057" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  ),
  Home: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L6 18v22a2 2 0 002 2h10V30h12v12h10a2 2 0 002-2V18L24 4z" fill="#ff6b6b" />
      <path d="M18 30h12v12H18V30z" fill="#ffe066" />
      <path d="M24 4L6 18h8v24h20V18h8L24 4z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Visit: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="6" fill="#ff6b6b" stroke="#fa5252" strokeWidth="1.5" />
      <circle cx="48" cy="16" r="6" fill="#339af0" stroke="#228be6" strokeWidth="1.5" />
      <circle cx="32" cy="44" r="8" fill="#51cf66" stroke="#37b24d" strokeWidth="2" />
      <line x1="20" y1="20" x2="28" y2="38" stroke="#ced4da" strokeWidth="2" strokeDasharray="3,3" />
      <line x1="44" y1="20" x2="36" y2="38" stroke="#ced4da" strokeWidth="2" strokeDasharray="3,3" />
      <line x1="22" y1="16" x2="42" y2="16" stroke="#ced4da" strokeWidth="2" />
    </svg>
  ),
  Profile: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="4" fill="#339af0" stroke="#fff" strokeWidth="2" />
      <circle cx="24" cy="18" r="7" fill="#fff" />
      <path d="M12 36c0-6 5.373-10 12-10s12 4 12 10H12z" fill="#fff" />
    </svg>
  ),
  Register: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="6" width="28" height="36" rx="3" fill="#fcc419" stroke="#fff" strokeWidth="2" />
      <rect x="16" y="12" width="16" height="24" rx="1" fill="#fff" />
      <line x1="20" y1="18" x2="28" y2="18" stroke="#fab005" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="24" x2="28" y2="24" stroke="#fab005" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="30" x2="28" y2="30" stroke="#fab005" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h4M8 20h4M8 28h4M8 36h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  Gallery: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="4" fill="#339af0" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="16" r="4" fill="#ffd43b" />
      <polygon points="10,38 20,24 30,34 38,26 42,38" fill="#51cf66" stroke="#fff" strokeWidth="1.5" />
    </svg>
  ),
  Target: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="10" width="40" height="48" rx="3" fill="#ffe3e3" stroke="#ffc9c9" strokeWidth="2" />
      <rect x="16" y="16" width="32" height="38" fill="#fff" rx="1" />
      <rect x="20" y="24" width="6" height="22" fill="#ff6b6b" />
      <rect x="29" y="30" width="6" height="16" fill="#4dabf7" />
      <rect x="38" y="20" width="6" height="26" fill="#51cf66" />
    </svg>
  ),
  Robot: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="36" height="44" rx="3" fill="#2b8a3e" stroke="#fff" strokeWidth="2" />
      <rect x="18" y="10" width="28" height="44" rx="2" fill="#51cf66" stroke="#fff" strokeWidth="2" />
      <path d="M32 24l-10-5 10-5 10 5-10 5z" fill="#343a40" />
      <path d="M26 21.5v4c0 1.5 1.5 2 6 2s6-.5 6-2v-4" fill="#343a40" />
      <path d="M38 19l3 3" stroke="#ffd43b" strokeWidth="1.5" />
    </svg>
  ),
  Compliance: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#51cf66" stroke="#fff" strokeWidth="2" />
      <path d="M14 26a10 10 0 0120 0v2H14v-2z" fill="#fff" />
      <circle cx="24" cy="18" r="5" fill="#fff" />
      <path d="M12 22a2 2 0 012-2h20a2 2 0 012 2v2H12v-2z" fill="#2b8a3e" />
      <path d="M30 20a4 4 0 014 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  GoogleSheet: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="6" width="28" height="36" rx="3" fill="#20c997" stroke="#fff" strokeWidth="2" />
      <rect x="16" y="16" width="16" height="16" fill="#fff" />
      <line x1="16" y1="21" x2="32" y2="21" stroke="#20c997" strokeWidth="1.5" />
      <line x1="16" y1="27" x2="32" y2="27" stroke="#20c997" strokeWidth="1.5" />
      <line x1="21" y1="16" x2="21" y2="32" stroke="#20c997" strokeWidth="1.5" />
      <line x1="27" y1="16" x2="27" y2="32" stroke="#20c997" strokeWidth="1.5" />
    </svg>
  ),
  GlobalSearch: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="14" fill="#e7f5ff" stroke="#339af0" strokeWidth="2" />
      <ellipse cx="20" cy="20" rx="10" ry="4" stroke="#74c0fc" strokeWidth="1.5" />
      <ellipse cx="20" cy="20" rx="4" ry="10" stroke="#74c0fc" strokeWidth="1.5" />
      <line x1="20" y1="6" x2="20" y2="34" stroke="#74c0fc" strokeWidth="1.5" />
      <line x1="6" y1="20" x2="34" y2="20" stroke="#74c0fc" strokeWidth="1.5" />
      <line x1="30" y1="30" x2="42" y2="42" stroke="#495057" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="18" width="28" height="24" rx="4" fill="#339af0" stroke="#fff" strokeWidth="2" />
      <path d="M16 18v-6a8 8 0 0116 0v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="30" r="3" fill="#fff" />
      <path d="M24 33v5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  Print: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18h28v14H10z" fill="#ced4da" stroke="#495057" strokeWidth="2" />
      <rect x="14" y="6" width="20" height="12" fill="#fff" stroke="#495057" strokeWidth="2" />
      <rect x="14" y="24" width="20" height="18" fill="#ffd43b" stroke="#fab005" strokeWidth="2" />
      <line x1="18" y1="30" x2="30" y2="30" stroke="#fff" strokeWidth="2" />
      <line x1="18" y1="36" x2="26" y2="36" stroke="#fff" strokeWidth="2" />
    </svg>
  ),
  Menu: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 12h36M6 24h36M6 36h36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  Sun: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="10" fill="#ffd43b" stroke="#fab005" strokeWidth="2" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.8 9.8l4.3 4.3M33.9 33.9l4.3 4.3M9.8 38.2l4.3-4.3M33.9 14.1l4.3-4.3" stroke="#fab005" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  Moon: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 28a16 16 0 1020-15.5 16 16 0 01-20 15.5z" fill="#74c0fc" stroke="#228be6" strokeWidth="2.5" />
    </svg>
  ),
  Trophy: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 6h32v24c0 8.837-7.163 16-16 16s-16-7.163-16-16V6z" fill="#ffd43b" stroke="#fab005" strokeWidth="2" />
      <path d="M24 46h16v10H24z" fill="#ced4da" stroke="#495057" strokeWidth="2" />
      <path d="M12 56h40" stroke="#495057" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 14H8a4 4 0 00-4 4v6a4 4 0 004 4h8" stroke="#fab005" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 14h8a4 4 0 014 4v6a4 4 0 01-4 4h-8" stroke="#fab005" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  ),
  // Additional specialized premium illustrations corresponding directly to JHPMS dashboard card icons
  Agency: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="18" width="40" height="38" rx="2" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <rect x="18" y="24" width="10" height="10" rx="1" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <rect x="36" y="24" width="10" height="10" rx="1" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <rect x="18" y="40" width="10" height="10" rx="1" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <rect x="36" y="40" width="10" height="10" rx="1" fill="#ffe066" stroke="#fab005" strokeWidth="1.5" />
      <rect x="27" y="48" width="10" height="8" rx="1" fill="#4dabf7" stroke="#228be6" strokeWidth="1.5" />
      <path d="M8 56h48" stroke="#495057" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="22" y="6" width="20" height="12" rx="1" fill="#339af0" stroke="#228be6" strokeWidth="1.5" />
      <circle cx="32" cy="12" r="2" fill="#fff" />
    </svg>
  ),
  ICTLab: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="26" width="36" height="24" rx="2" fill="#ffd8a8" stroke="#f59f00" strokeWidth="2" />
      <rect x="18" y="30" width="28" height="16" fill="#fff" />
      <rect x="24" y="32" width="16" height="10" rx="1" fill="#4dabf7" />
      <circle cx="16" cy="18" r="5" fill="#ffd43b" />
      <path d="M8 32c0-4 4-6 8-6s8 2 8 6" fill="#ff6b6b" />
      <line x1="20" y1="24" x2="26" y2="18" stroke="#ffd43b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  SmartClass: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="52" height="36" rx="3" fill="#20c997" stroke="#0ca678" strokeWidth="2" />
      <rect x="10" y="14" width="44" height="28" fill="#121212" rx="1" />
      <circle cx="20" cy="24" r="4" fill="#ff6b6b" />
      <line x1="28" y1="22" x2="40" y2="22" stroke="#4dabf7" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="26" x2="36" y2="26" stroke="#ffd43b" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 46l-4 12h28l-4-12" stroke="#495057" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Teachers: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="10" width="36" height="26" rx="2" fill="#0ca678" stroke="#087f5b" strokeWidth="2" />
      <text x="28" y="26" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">A B C</text>
      <circle cx="14" cy="22" r="6" fill="#ffd43b" stroke="#f59f00" strokeWidth="1" />
      <path d="M6 38c0-5 4-8 8-8s8 3 8 8" fill="#ff6b6b" stroke="#fa5252" strokeWidth="1" />
      <line x1="16" y1="28" x2="26" y2="20" stroke="#ffd43b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Instructors: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="24" width="44" height="28" rx="2" fill="#e9ecef" stroke="#495057" strokeWidth="2" />
      <rect x="14" y="28" width="36" height="20" fill="#228be6" rx="1" />
      <circle cx="32" cy="14" r="6" fill="#ffd43b" />
      <path d="M22 24c0-4 4-6 10-6s10 2 10 6" fill="#ffd43b" />
    </svg>
  ),
  ClassConducted: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="52" height="34" rx="3" fill="#845ef7" stroke="#7048e8" strokeWidth="2" />
      <rect x="10" y="12" width="44" height="26" fill="#f8f9fa" />
      <path d="M2 42h60" stroke="#495057" strokeWidth="3" />
      <circle cx="20" cy="28" r="3" fill="#ff8787" />
      <circle cx="32" cy="28" r="3" fill="#74c0fc" />
      <circle cx="44" cy="28" r="3" fill="#8ce99a" />
    </svg>
  ),
  IssueFound: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="6" width="36" height="52" rx="4" fill="#ffd43b" stroke="#fab005" strokeWidth="2" />
      <rect x="20" y="12" width="24" height="40" fill="#fff" rx="1" />
      <path d="M32 18v16" stroke="#fa5252" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="42" r="3.5" fill="#fa5252" />
    </svg>
  ),
  CallStatus: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="6" width="32" height="52" rx="5" fill="#495057" stroke="#343a40" strokeWidth="2" />
      <rect x="19" y="10" width="26" height="40" fill="#fff" />
      <path d="M23 20l3 3 6-6M23 30l3 3 6-6M23 40l3 3 6-6" stroke="#51cf66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="53" r="2" fill="#fff" />
    </svg>
  ),
  StatusReport: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="10" width="40" height="48" rx="3" fill="#ffe3e3" stroke="#ffc9c9" strokeWidth="2" />
      <rect x="16" y="16" width="32" height="38" fill="#fff" rx="1" />
      <rect x="20" y="24" width="6" height="22" fill="#ff6b6b" />
      <rect x="29" y="30" width="6" height="16" fill="#4dabf7" />
      <rect x="38" y="20" width="6" height="26" fill="#51cf66" />
    </svg>
  ),
  JGuruji: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="36" height="44" rx="3" fill="#2b8a3e" stroke="#fff" strokeWidth="2" />
      <rect x="18" y="10" width="28" height="44" rx="2" fill="#51cf66" stroke="#fff" strokeWidth="2" />
      <path d="M32 24l-10-5 10-5 10 5-10 5z" fill="#343a40" />
      <path d="M26 21.5v4c0 1.5 1.5 2 6 2s6-.5 6-2v-4" fill="#343a40" />
      <path d="M38 19l3 3" stroke="#ffd43b" strokeWidth="1.5" />
    </svg>
  ),
  MDM: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-8 h-8"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="#ffe3e3" stroke="#ffc9c9" strokeWidth="2" />
      <path d="M16 32a16 16 0 0032 0H16z" fill="#ff6b6b" stroke="#fa5252" strokeWidth="1.5" />
      <path d="M24 20v8M40 20v8" stroke="#ff8787" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // Additional decorative navigation icons for complete brand duplication
  ComplainBox: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="28" rx="4" fill="#b197fc" stroke="#fff" strokeWidth="2" />
      <path d="M6 14l18 12 18-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Help: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#4dabf7" stroke="#fff" strokeWidth="2" />
      <text x="24" y="31" fill="#fff" fontSize="22" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">?</text>
    </svg>
  ),
  ExecutiveClipboard: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="8" width="40" height="50" rx="4" fill="#1c7d7b" stroke="#fff" strokeWidth="2" />
      <rect x="22" y="4" width="20" height="10" rx="3" fill="#ffd43b" stroke="#f59f00" strokeWidth="1.5" />
      <circle cx="32" cy="9" r="2.5" fill="#f59f00" />
      <rect x="18" y="22" width="28" height="3" rx="1.5" fill="#fff" opacity="0.9" />
      <rect x="18" y="29" width="20" height="3" rx="1.5" fill="#fff" opacity="0.7" />
      <rect x="18" y="36" width="24" height="3" rx="1.5" fill="#fff" opacity="0.5" />
      <rect x="18" y="43" width="16" height="3" rx="1.5" fill="#51cf66" opacity="0.9" />
      <path d="M40 44l3 3 6-6" stroke="#51cf66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Gauge: (p) => (
    <svg viewBox="0 0 48 48" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 30a18 18 0 0136 0" stroke="#e9ecef" strokeWidth="5" strokeLinecap="round" />
      <path d="M6 30a18 18 0 0124.5-16.8" stroke="#1c7d7b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="24" cy="30" r="3" fill="#1c7d7b" />
      <line x1="24" y1="30" x2="34" y2="18" stroke="#1c7d7b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  Presentation: (p) => (
    <svg viewBox="0 0 64 64" className={p.className || "w-5 h-5"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="52" height="34" rx="4" fill="#3b5bdb" stroke="#fff" strokeWidth="2" />
      <rect x="10" y="12" width="44" height="26" fill="#1e1b4b" rx="2" />
      <polygon points="32,42 22,58 42,58" fill="#495057" stroke="#343a40" strokeWidth="2" strokeLinejoin="round" />
      <line x1="32" y1="42" x2="32" y2="48" stroke="#343a40" strokeWidth="4" />
      <rect x="18" y="24" width="6" height="10" fill="#ffd43b" />
      <rect x="26" y="18" width="6" height="16" fill="#51cf66" />
      <rect x="34" y="22" width="6" height="12" fill="#ff6b6b" />
      <circle cx="44" cy="20" r="3.5" fill="#339af0" />
    </svg>
  )
};
