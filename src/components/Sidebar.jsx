'use client';

import React from 'react';

export default function Sidebar({ currentUser, activeView, setActiveView, onLogout, isFirebaseConnected, dbStatusDesc, divisions = [] }) {
  if (!currentUser) return null;

  // Find division name dynamically from divisions list (or fall back)
  const userDiv = divisions.find(d => d.id === currentUser.divisionId);
  const divisionName = userDiv ? userDiv.name : "ฝ่ายงานทั่วไป";

  // Get initials of name (first 2 letters of first name or name parts)
  const initials = currentUser.name
    ? currentUser.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)
    : 'U';

  // Core General Menu Items (Visible to all authenticated roles)
  const generalMenuItems = [
    { id: 'dashboard', label: 'แดชบอร์ดสรุปผล', icon: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/> },
    { id: 'assets', label: 'ทะเบียนครุภัณฑ์', icon: <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/> },
    { id: 'verifier', label: 'ตรวจสอบราคามาตรฐาน', icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/> },
  ];

  // System Backoffice Management Menu Items (Visible strictly ONLY to Super Admin)
  const isSuperAdmin = (currentUser?.role || '').trim().toLowerCase() === 'super admin';

  const backofficeMenuItems = [
    { id: 'org', label: 'โครงสร้างและฝ่ายงาน', icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/> },
    { id: 'users', label: 'จัดการผู้ใช้และสิทธิ์', icon: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/> },
    { id: 'database', label: 'จัดการฐานข้อมูล', icon: <path d="M12 2C6.48 2 2 6.48 2 12v6c0 2.21 4.48 4 10 4s10-1.79 10-4v-6c0-5.52-4.48-10-10-10zm0 4c3.31 0 6 1.34 6 3s-2.69 3-6 3-6-1.34-6-3 2.69-3 6-3zm6 12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-2.24c1.69 1.1 4.04 1.74 6.7 1.74s5.01-.64 6.7-1.74V18zm0-4.5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-2.24c1.69 1.1 4.04 1.74 6.7 1.74s5.01-.64 6.7-1.74V13.5z"/> },
    { id: 'trash', label: 'ถังขยะกู้ครุภัณฑ์', icon: <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM9 9h2v8H9V9zm4 0h2v8h-2V9z"/> }
  ];
  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-icon">
          <svg viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        </div>
        <div className="brand-info">
          <h2>ระบบจัดการครุภัณฑ์</h2>
          <span>สำนักงานสาธารณสุขและสิ่งแวดล้อม เทศบาลนครยะลา</span>
        </div>
      </div>

      {/* User Profile Header Section */}
      <div className="user-profile-section" id="user-profile-sidebar" style={{ display: 'flex' }}>
        <div className="user-avatar-wrapper">
          <div className="user-avatar" id="sidebar-user-avatar">{initials}</div>
          <div className="user-status-badge"></div>
        </div>
        <div className="user-info-text">
          <h3 id="sidebar-user-name">{currentUser.name}</h3>
          <span id="sidebar-user-role">{`${divisionName} (${currentUser.role})`}</span>
        </div>
      </div>

      <nav className="nav-menu">
        <span className="menu-section-label" style={{ display: 'block', padding: '0 0.5rem', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '0.5rem', opacity: 0.8 }}>
          เมนูใช้งานทั่วไป
        </span>
        {generalMenuItems.map(item => (
          <a 
            key={item.id} 
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveView(item.id);
            }}
          >
            <svg viewBox="0 0 24 24">{item.icon}</svg>
            {item.label}
          </a>
        ))}

        {isSuperAdmin && (
          <>
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0.5rem', opacity: 0.5 }}></div>
            <span className="menu-section-label" style={{ display: 'block', padding: '0 0.5rem', fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '0.5rem', opacity: 0.8 }}>
              การจัดการหลังบ้าน
            </span>
            {backofficeMenuItems.map(item => (
              <a 
                key={item.id} 
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.id);
                }}
              >
                <svg viewBox="0 0 24 24">{item.icon}</svg>
                {item.label}
              </a>
            ))}
          </>
        )}
        
        <a className="nav-item logout-btn" id="logout-menu-btn" onClick={onLogout}>
          <svg viewBox="0 0 24 24">
            <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
          ออกจากระบบ
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="db-status-card" title={dbStatusDesc}>
          <div 
            id="db-indicator" 
            className={`status-indicator ${isFirebaseConnected ? 'firebase' : 'local'}`}
          ></div>
          <div className="status-info">
            <h4 id="db-status-title">{isFirebaseConnected ? "Cloud Active" : "Local DB Mode"}</h4>
            <p id="db-status-desc">{dbStatusDesc}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
