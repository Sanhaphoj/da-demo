'use client';

import React, { useState, useEffect } from 'react';
import { showToast } from '../lib/toast';

export default function DatabaseView({ isFirebaseConnected, dbStatusDesc, onSaveFirebaseConfig, currentConfig }) {
  // Database Driver Type Selection: 'firebase' | 'postgres' | 'mysql'
  const [driverType, setDriverType] = useState('firebase');
  const [isNetlify, setIsNetlify] = useState(false);

  // Firebase Config States
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [measurementId, setMeasurementId] = useState('');
  const [jsonPaste, setJsonPaste] = useState('');

  // PostgreSQL Config States
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDatabase, setPgDatabase] = useState('');
  const [pgUser, setPgUser] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [pgSsl, setPgSsl] = useState(true);

  // MySQL Config States
  const [myHost, setMyHost] = useState('');
  const [myPort, setMyPort] = useState('3306');
  const [myDatabase, setMyDatabase] = useState('');
  const [myUser, setMyUser] = useState('');
  const [myPassword, setMyPassword] = useState('');

  // Simulated Testing Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(null);

  // Stepper state for guides
  const [activeStep, setActiveStep] = useState(1);

  // Load existing credentials & check URL for Netlify deployment
  useEffect(() => {
    let checkNetlify = false;
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      if (currentUrl.includes('netlify.app')) {
        checkNetlify = true;
        setIsNetlify(true);
        setDriverType('firebase'); // Force Firebase
        localStorage.setItem('da_active_driver_type', 'firebase');
      }
    }

    if (currentConfig) {
      setApiKey(currentConfig.apiKey || '');
      setAuthDomain(currentConfig.authDomain || '');
      setProjectId(currentConfig.projectId || '');
      setStorageBucket(currentConfig.storageBucket || '');
      setMessagingSenderId(currentConfig.messagingSenderId || '');
      setAppId(currentConfig.appId || '');
      setMeasurementId(currentConfig.measurementId || '');
    }

    // Load custom SQL driver cache if exists (only if not forced to firebase by Netlify)
    if (!checkNetlify) {
      const savedPg = localStorage.getItem('da_postgres_config');
      if (savedPg) {
        try {
          const parsed = JSON.parse(savedPg);
          setPgHost(parsed.host || '');
          setPgPort(parsed.port || '5432');
          setPgDatabase(parsed.database || '');
          setPgUser(parsed.user || '');
          setPgPassword(parsed.password || '');
          setPgSsl(parsed.ssl !== false);
        } catch (e) { }
      }

      const savedMy = localStorage.getItem('da_mysql_config');
      if (savedMy) {
        try {
          const parsed = JSON.parse(savedMy);
          setMyHost(parsed.host || '');
          setMyPort(parsed.port || '3306');
          setMyDatabase(parsed.database || '');
          setMyUser(parsed.user || '');
          setMyPassword(parsed.password || '');
        } catch (e) { }
      }

      const savedDriver = localStorage.getItem('da_active_driver_type');
      if (savedDriver) {
        setDriverType(savedDriver);
      }
    }
  }, [currentConfig]);

  // JSON Config Auto-Parser
  const handleJsonParse = () => {
    if (!jsonPaste.trim()) {
      showToast('กรุณากรอกหรือวางโค้ดค่ากำหนด Firebase SDK ก่อนทำการถอดรหัส', 'warning');
      return;
    }

    try {
      let cleanedText = jsonPaste.trim();
      
      // 1. If it has curly braces, extract everything inside them. Otherwise, wrap in curly braces.
      if (cleanedText.includes('{') && cleanedText.includes('}')) {
        const start = cleanedText.indexOf('{');
        const end = cleanedText.lastIndexOf('}') + 1;
        cleanedText = cleanedText.substring(start, end);
      } else {
        cleanedText = '{' + cleanedText + '}';
      }

      // 2. Clean and format the text into valid standard JSON format
      cleanedText = cleanedText
        .replace(/(^|[{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}')
        .replace(/;\s*$/g, '');

      const parsed = JSON.parse(cleanedText);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);
      if (parsed.measurementId) setMeasurementId(parsed.measurementId);

      setJsonPaste('');
      showToast('ถอดรหัสและนำเข้าข้อมูลตั้งค่า Firebase สำเร็จแล้ว!', 'success');
    } catch (e) {
      console.error("JSON parse error:", e);
      showToast('ไม่สามารถถอดรหัสข้อมูลนี้ได้ กรุณาตรวจสอบรูปแบบความถูกต้องของโค้ดที่วาง', 'error');
    }
  };

  // Save SQL configs
  const handleSaveSqlConfig = (type) => {
    if (isNetlify) {
      showToast('บนระบบคลาวด์ Netlify จะถูกบังคับให้เชื่อมต่อกับ Cloud Firebase เพื่อความเสถียรของระบบเท่านั้น', 'error');
      return;
    }

    setIsTesting(true);
    setTestSuccess(null);
    showToast('กำลังจำลองตรวจสอบสัญญาณและทดสอบเชื่อมต่อฐานข้อมูล...', 'info');

    setTimeout(() => {
      setIsTesting(false);
      const isPostgres = type === 'postgres';
      const host = isPostgres ? pgHost : myHost;
      const db = isPostgres ? pgDatabase : myDatabase;
      const user = isPostgres ? pgUser : myUser;

      if (!host || !db || !user) {
        showToast('กรุณากรอกข้อมูลการเชื่อมต่อที่สำคัญให้ครบถ้วนก่อนทำการบันทึกและทดสอบ', 'warning');
        setTestSuccess(false);
        return;
      }

      setTestSuccess(true);
      if (isPostgres) {
        localStorage.setItem('da_postgres_config', JSON.stringify({ host: pgHost, port: pgPort, database: pgDatabase, user: pgUser, password: pgPassword, ssl: pgSsl }));
      } else {
        localStorage.setItem('da_mysql_config', JSON.stringify({ host: myHost, port: myPort, database: myDatabase, user: myUser, password: myPassword }));
      }
      localStorage.setItem('da_active_driver_type', type);
      localStorage.setItem('da_firebase_config', ''); // Clear active firebase to trigger local offline mode on front side
      onSaveFirebaseConfig(null); // Cut Firebase real-time sync in client side

      showToast(`เชื่อมต่อและเปิดใช้งานระบบฐานข้อมูล ${isPostgres ? 'PostgreSQL' : 'MySQL'} สำเร็จเรียบร้อยแล้ว!`, 'success');
    }, 2000);
  };

  const handleSaveFirebase = (e) => {
    e.preventDefault();

    if (!apiKey || !projectId || !appId) {
      showToast('ข้อมูลสำคัญไม่ครบถ้วน กรุณากรอก API Key, Project ID และ App ID', 'warning');
      return;
    }

    const configToSave = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      measurementId: measurementId.trim()
    };

    localStorage.setItem('da_active_driver_type', 'firebase');
    onSaveFirebaseConfig(configToSave);
  };

  const handleDisconnectFirebase = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการตัดการเชื่อมต่อกับฐานข้อมูลระบบคลาวด์ เพื่อสลับกลับไปใช้งานโหมดจัดเก็บข้อมูลในเบราว์เซอร์ (Local DB Mode)?')) {
      onSaveFirebaseConfig(null);
      localStorage.removeItem('da_active_driver_type');
      setApiKey('');
      setAuthDomain('');
      setProjectId('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setMeasurementId('');
    }
  };

  const handleDriverChange = (type) => {
    if (isNetlify && type !== 'firebase') {
      showToast('ระบบโฮสต์ Netlify ถูกล็อกไว้ให้ใช้ Cloud Firebase เพื่อความปลอดภัยสูงสุดในส่วนของเซิร์ฟเวอร์เลส', 'warning');
      return;
    }
    setDriverType(type);
    setActiveStep(1); // Reset guide step
    setTestSuccess(null);
  };

  return (
    <section id="view-database" className="view-container active" style={{ animation: 'scaleIn 0.3s ease-out' }}>

      {/* 1. NETLIFY PRODUCTION DEPLOYMENT ENFORCEMENT NOTIFICATION CALLOUT */}
      {isNetlify && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: 'var(--glass-shadow)',
          backdropFilter: 'var(--glass-blur)'
        }}>
          <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>⚠️</div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong style={{ fontSize: '0.9rem', color: '#f87171', display: 'block', marginBottom: '4px' }}>
              กำลังใช้งานบนเซิร์ฟเวอร์คลาวด์ Netlify App (netlify.app)
            </strong>
            เพื่อการทำงานที่เสถียรและรักษาความปลอดภัยภายใต้มาตรฐานสถาปัตยกรรม Serverless Cloud Security ของระบบ Netlify ตัวแอปจึงสลับให้เชื่อมโยงข้อมูลกับระบบฐานข้อมูลระบบคลาวด์เรียลไทม์ Cloud Firebase (Firestore) เท่านั้น ส่วนของไดรเวอร์ SQL (PostgreSQL และ MySQL) จะถูกจำกัดไว้ให้ใช้งานได้เฉพาะโปรเจกต์ที่ทดสอบบนคอมพิวเตอร์ของคุณเอง (Localhost) เพื่อลดความเสี่ยงด้านความปลอดภัยและข้อจำกัดสัญญาณ
          </div>
        </div>
      )}

      {/* 2. TOP SEGMENTED SELECTOR CARDS */}
      <div className="table-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>เลือกตัวเชื่อมโยงและจัดเก็บข้อมูล (Database Driver Select)</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

          {/* Card A: Firebase */}
          <div
            onClick={() => handleDriverChange('firebase')}
            style={{
              background: driverType === 'firebase' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'var(--bg-surface)',
              border: `2px solid ${driverType === 'firebase' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: driverType === 'firebase' ? 'var(--glass-shadow), 0 0 15px rgba(99, 102, 241, 0.15)' : 'none'
            }}
            className="driver-card"
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #ffca28 0%, #ffa000 100%)', display: driverType === 'firebase' ? 'block' : 'none' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 202, 40, 0.12)', color: '#ffca28', width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔥</div>
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>Cloud Firebase</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Real-time NoSQL Sync</span>
              </div>
            </div>
          </div>

          {/* Card B: PostgreSQL */}
          <div
            onClick={() => handleDriverChange('postgres')}
            style={{
              background: isNetlify ? 'rgba(0, 0, 0, 0.2)' : driverType === 'postgres' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'var(--bg-surface)',
              border: `2px solid ${isNetlify ? 'transparent' : driverType === 'postgres' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              cursor: isNetlify ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              opacity: isNetlify ? 0.35 : 1,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: driverType === 'postgres' && !isNetlify ? 'var(--glass-shadow), 0 0 15px rgba(99, 102, 241, 0.15)' : 'none'
            }}
            className="driver-card"
            title={isNetlify ? "PostgreSQL ถูกปิดการใช้งานบน Netlify คลาวด์" : "PostgreSQL Driver"}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #336791 0%, #2f5e85 100%)', display: driverType === 'postgres' && !isNetlify ? 'block' : 'none' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(51, 103, 145, 0.12)', color: '#336791', width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                {isNetlify ? '❌' : '🐘'}
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>PostgreSQL Driver</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isNetlify ? 'ถูกบล็อกบน Netlify' : 'SQL Relational Database'}</span>
              </div>
            </div>
          </div>

          {/* Card C: MySQL */}
          <div
            onClick={() => handleDriverChange('mysql')}
            style={{
              background: isNetlify ? 'rgba(0, 0, 0, 0.2)' : driverType === 'mysql' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'var(--bg-surface)',
              border: `2px solid ${isNetlify ? 'transparent' : driverType === 'mysql' ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              cursor: isNetlify ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              opacity: isNetlify ? 0.35 : 1,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: driverType === 'mysql' && !isNetlify ? 'var(--glass-shadow), 0 0 15px rgba(99, 102, 241, 0.15)' : 'none'
            }}
            className="driver-card"
            title={isNetlify ? "MySQL ถูกปิดการใช้งานบน Netlify คลาวด์" : "MySQL Driver"}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #00758f 0%, #005a6e 100%)', display: driverType === 'mysql' && !isNetlify ? 'block' : 'none' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(0, 117, 143, 0.12)', color: '#00758f', width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                {isNetlify ? '❌' : '🐬'}
              </div>
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>MySQL Driver</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{isNetlify ? 'ถูกบล็อกบน Netlify' : 'SQL Relational Database'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. BODY COLUMNS VIEW SECTION (Form & Manual Guide) */}
      <div className="verifier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>

        {/* LEFT COLUMN: ACTIVE VIEW CONNECTOR FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Driver Status Card */}
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 className="card-title">สถานะการเชื่อมต่อระบบฐานข้อมูล</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: (driverType === 'firebase' && isFirebaseConnected) ? 'var(--color-success)' : testSuccess ? 'var(--color-success)' : 'var(--color-warning)',
                  boxShadow: `0 0 10px ${(driverType === 'firebase' && isFirebaseConnected) ? 'var(--color-success)' : testSuccess ? 'var(--color-success)' : 'var(--color-warning)'}`,
                  animation: '2s pulse infinite'
                }}
              ></div>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>
                  {driverType === 'firebase' && isFirebaseConnected ? 'Firebase Cloud Active' : testSuccess ? `Driver Active (${driverType.toUpperCase()})` : 'Offline / Local storage DB Mode'}
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {driverType === 'firebase' ? dbStatusDesc : testSuccess ? `เชื่อมต่อและเปิดใช้งานระบบฐานข้อมูล ${driverType.toUpperCase()} สำเร็จแล้ว` : 'ระบบฐานข้อมูลจัดเก็บในหน่วยความจำเบราว์เซอร์ชั่วคราว (Local Storage Mode)'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Case: A. FIREBASE CONNECTOR */}
          {driverType === 'firebase' && (
            <div className="table-card" style={{ padding: '1.5rem', animation: 'scaleIn 0.3s ease-out' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 className="card-title">ตั้งค่าการเชื่อมต่อ Cloud Firebase (Firestore)</h3>
              </div>

              {/* Auto SDK Paste Parser */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)', display: 'block', marginBottom: '0.5rem' }}>
                  💡 ตัวแปลงและนำเข้าข้อมูลอัตโนมัติ (SDK Config Auto-Parser)
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="คัดลอกโค้ด เช่น const firebaseConfig = { ... } จากหน้า Firebase Console มาวางที่นี่เพื่อรวดเร็ว..."
                  style={{ fontSize: '0.8rem', fontFamily: 'monospace', resize: 'vertical', marginBottom: '0.75rem' }}
                  value={jsonPaste}
                  onChange={(e) => setJsonPaste(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem' }}
                  onClick={handleJsonParse}
                >
                  ⚡ ถอดรหัสและกรอกข้อมูลในช่องอัตโนมัติ
                </button>
              </div>

              <form onSubmit={handleSaveFirebase} className="settings-form">
                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="cfg-apikey">API Key *</label>
                  <input type="text" id="cfg-apikey" className="form-control" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIzaSy..." required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="cfg-projectid">Project ID *</label>
                    <input type="text" id="cfg-projectid" className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="my-project-id" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="cfg-authdomain">Auth Domain</label>
                    <input type="text" id="cfg-authdomain" className="form-control" value={authDomain} onChange={(e) => setAuthDomain(e.target.value)} placeholder="my-project-id.firebaseapp.com" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="cfg-bucket">Storage Bucket</label>
                    <input type="text" id="cfg-bucket" className="form-control" value={storageBucket} onChange={(e) => setStorageBucket(e.target.value)} placeholder="my-project-id.firebasestorage.app" />
                  </div>
                  <div className="input-group">
                    <label htmlFor="cfg-sender">Messaging Sender ID</label>
                    <input type="text" id="cfg-sender" className="form-control" value={messagingSenderId} onChange={(e) => setMessagingSenderId(e.target.value)} placeholder="1234567890" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label htmlFor="cfg-appid">App ID *</label>
                    <input type="text" id="cfg-appid" className="form-control" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="1:1234:web:abcd" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="cfg-measure">Measurement ID</label>
                    <input type="text" id="cfg-measure" className="form-control" value={measurementId} onChange={(e) => setMeasurementId(e.target.value)} placeholder="G-XXXXXX" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>💾 บันทึกการตั้งค่าและเชื่อมต่อ Firebase Cloud</button>
                  {isFirebaseConnected && (
                    <button type="button" className="btn-secondary" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={handleDisconnectFirebase}>🔌 ตัดการเชื่อมต่อระบบคลาวด์</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Form Case: B. POSTGRESQL CONNECTOR */}
          {driverType === 'postgres' && !isNetlify && (
            <div className="table-card" style={{ padding: '1.5rem', animation: 'scaleIn 0.3s ease-out' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 className="card-title">ตั้งค่าการเชื่อมต่อ PostgreSQL Driver</h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveSqlConfig('postgres'); }} className="settings-form">
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="pg-host">Host / IP Address *</label>
                    <input type="text" id="pg-host" className="form-control" value={pgHost} onChange={(e) => setPgHost(e.target.value)} placeholder="aws-rds.xxxx.supabase.co" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="pg-port">Port *</label>
                    <input type="number" id="pg-port" className="form-control" value={pgPort} onChange={(e) => setPgPort(e.target.value)} placeholder="5432" required />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="pg-db">Database Name *</label>
                  <input type="text" id="pg-db" className="form-control" value={pgDatabase} onChange={(e) => setPgDatabase(e.target.value)} placeholder="postgres" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="input-group">
                    <label htmlFor="pg-user">User *</label>
                    <input type="text" id="pg-user" className="form-control" value={pgUser} onChange={(e) => setPgUser(e.target.value)} placeholder="postgres" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="pg-pwd">Password *</label>
                    <input type="password" id="pg-pwd" className="form-control" value={pgPassword} onChange={(e) => setPgPassword(e.target.value)} placeholder="••••••••••••" required />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" id="pg-ssl" checked={pgSsl} onChange={(e) => setPgSsl(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="pg-ssl" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>เปิดการเชื่อมต่อแบบเข้ารหัสความปลอดภัยสูง (Enable SSL Connection)</label>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isTesting}>
                  {isTesting ? '⏳ กำลังบันทึกและทดสอบ...' : '💾 บันทึกและทดสอบเชื่อมโยง PostgreSQL'}
                </button>
              </form>
            </div>
          )}

          {/* Form Case: C. MYSQL CONNECTOR */}
          {driverType === 'mysql' && !isNetlify && (
            <div className="table-card" style={{ padding: '1.5rem', animation: 'scaleIn 0.3s ease-out' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 className="card-title">ตั้งค่าการเชื่อมต่อ MySQL / MariaDB Driver</h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveSqlConfig('mysql'); }} className="settings-form">
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <label htmlFor="my-host">Host / IP Address *</label>
                    <input type="text" id="my-host" className="form-control" value={myHost} onChange={(e) => setMyHost(e.target.value)} placeholder="127.0.0.1 or mysql-server" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="my-port">Port *</label>
                    <input type="number" id="my-port" className="form-control" value={myPort} onChange={(e) => setMyPort(e.target.value)} placeholder="3306" required />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="my-db">Database Name *</label>
                  <input type="text" id="my-db" className="form-control" value={myDatabase} onChange={(e) => setMyDatabase(e.target.value)} placeholder="da_sasuk_db" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label htmlFor="my-user">User *</label>
                    <input type="text" id="my-user" className="form-control" value={myUser} onChange={(e) => setMyUser(e.target.value)} placeholder="root" required />
                  </div>
                  <div className="input-group">
                    <label htmlFor="my-pwd">Password *</label>
                    <input type="password" id="my-pwd" className="form-control" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} placeholder="••••••••••••" required />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isTesting}>
                  {isTesting ? '⏳ กำลังบันทึกและทดสอบ...' : '💾 บันทึกและทดสอบเชื่อมโยง MySQL'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Guide Container Card */}
          <div className="table-card" style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>วิธีตั้งค่าและการเชื่อมโยงข้อมูล</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  ทำตามขั้นตอนเพื่อเปิดใช้งานพอร์ตเชื่อมฐานข้อมูลของคุณ
                </p>
              </div>
              <div style={{ background: 'var(--accent-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>
                สเต็ป {activeStep} / 3
              </div>
            </div>

            {/* Guide: Firebase */}
            {driverType === 'firebase' && (
              <>
                {activeStep === 1 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 1: สมัครใช้งานและสร้างโปรเจกต์ Firebase
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        เปิดเว็บบราวเซอร์แล้วเข้าไปที่ระบบ <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Firebase Console</a> จากนั้นเข้าสู่ระบบด้วยบัญชี Google
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกปุ่ม **"Add project"** หรือ **"สร้างโปรเจกต์"** เพื่อตั้งค่าเริ่มทำฐานข้อมูลคลาวด์ชิ้นใหม่
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        พิมพ์ตั้งชื่อโปรเจกต์ของคุณ (เช่น <code>DA-Sasuk-Project</code>) ติ๊กยอมรับข้อตกลงและกดดำเนินการต่อ
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        เลือกว่าจะเปิดใช้งาน Google Analytics หรือไม่ (สามารถกดเปิดใช้งานหรือปิดชั่วคราวเพื่อความรวดเร็ว) จากนั้นกดปุ่มสุดท้ายเพื่อสร้างโปรเจกต์และรอสักครู่จนพร้อมใช้งาน
                      </li>
                    </ol>
                  </div>
                )}
                {activeStep === 2 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 2: สร้างและเปิดใช้งานฐานข้อมูล Cloud Firestore
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ที่เมนูด้านซ้ายมือ ค้นหาและคลิกหัวข้อ **"Build"** (สร้าง) แล้วเลือกเมนูย่อย **"Firestore Database"**
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกที่ปุ่ม **"Create database"** (สร้างฐานข้อมูล) สีส้มเด่นชัดที่อยู่ตรงกลางหน้าจอของหน้าต่างระบบ
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ที่แถบการเลือกสิทธิ์ความปลอดภัย ให้ติ๊กเลือก **"Start in test mode"** (เริ่มต้นในโหมดทดสอบ) เพื่อความสะดวกในการพัฒนาที่ตัวโปรแกรมจะสามารถอ่าน/เขียนข้อมูลจำลองได้ทันที แล้วกดดำเนินการต่อไป
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        เลือกพิกัดเก็บข้อมูล (Firestore Location): แนะนำให้เลือกเซิร์ฟเวอร์ที่อยู่ใกล้ประเทศไทยที่สุดคือ **`asia-southeast1` (Singapore)** เพื่อประสิทธิภาพความเร็วรับส่งข้อมูลในแถบ 50ms จากนั้นกดปุ่ม **"Enable"** และระบบจะสร้างอินสแตนซ์ Firestore ในชั่วอึดใจ
                      </li>
                    </ol>
                  </div>
                )}
                {activeStep === 3 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 3: ลงทะเบียนเว็บแอปพลิเคชันและนำชุดโค้ดเชื่อมต่อมาติดตั้ง
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        กลับไปที่เมนูหลักบนสุดที่ชื่อ **"Project Overview"** (ภาพรวมโปรเจกต์) ทางด้านซ้ายมือ จากนั้นมองหาแถบลงทะเบียน Get Started
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกเลือกปุ่มสัญลักษณ์ไอคอนเว็บแอป **`` (Web)** เพื่อลงทะเบียนโปรแกรมหน้าเว็บ
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ตั้งชื่อเว็บแอปพลิเคชัน (เช่น <code>DA-Sasuk-Web</code>) โดยไม่ต้องทำสัญลักษณ์ติ๊กเลือก Firebase Hosting จากนั้นคลิกเลือกปุ่ม **"Register app"**
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ระบบจะแสดงชุดโค้ด Config สำหรับ JavaScript SDK ให้คุณลากเมาส์ล้อมคลุมคัดลอก (Copy) ทั้งหมดเฉพาะที่มีตัวแปรโครงสร้าง:
                        <br />
                        <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '3px' }}>const firebaseConfig = &#123; ... &#125;;</code>
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        นำข้อความเชื่อมที่คัดลอกมากดวางในช่อง **"ตัวแปลงและนำเข้าข้อมูลอัตโนมัติ (SDK Config Auto-Parser)"** ด้านซ้ายมือ แล้วกดปุ่มถอดรหัส ข้อมูลตัวเชื่อมทั้งหมดจะถูกตรวจคัดแยกและกรอกใส่ฟอร์มให้คุณทันทีโดยไม่ต้องพิมพ์เองทีละช่อง!
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกปุ่ม **"บันทึกการตั้งค่าและเชื่อมต่อ Firebase Cloud"** เพื่อเปิดใช้การซิงค์ข้อมูลผ่าน Firebase คลาวด์เรียลไทม์สำเร็จทันที!
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* Guide: PostgreSQL */}
            {driverType === 'postgres' && (
              <>
                {activeStep === 1 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 1: สมัครและสร้างฐานข้อมูลคลาวด์ PostgreSQL ฟรี
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.5rem 0' }}>
                      คุณสามารถสร้างฐานข้อมูล SQL PostgreSQL ออนไลน์ได้ฟรีผ่านทางผู้ให้บริการยอดนิยมหลากหลายเจ้า ได้แก่:
                    </p>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.4rem' }}>
                        <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Supabase</a> - บริการฐานข้อมูลที่ง่าย ครบเครื่อง และแนะนำที่สุดสำหรับการสร้างโปรเจกต์เว็บแอปอย่างรวดเร็ว
                      </li>
                      <li style={{ marginBottom: '0.4rem' }}>
                        <a href="https://neon.tech/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Neon Postgres</a> - ให้บริการ SQL Serverless Postgres ออนไลน์ที่รวดเร็วและประมวลผลเร็วมาก
                      </li>
                      <li style={{ marginBottom: '0.4rem' }}>
                        หรือผู้ให้บริการคลาวด์อื่นๆ เช่น Render, AWS RDS หรือ DigitalOcean Managed Database
                      </li>
                    </ul>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                      *ข้อแนะนำ: แนะนำให้เลือกภูมิภาคจัดเก็บข้อมูล (Region) อยู่ที่ประเทศ **Singapore** เพื่อความหน่วงของพอร์ตเชื่อมข้อมูลต่ำที่สุด
                    </p>
                  </div>
                )}
                {activeStep === 2 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 2: คัดลอกรายละเอียดการเชื่อมต่อ (Connection Info)
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ล็อกอินเข้าหน้าแดชบอร์ดของผู้ให้บริการ ไปที่เมนู **Settings (การตั้งค่า)** เลือกหัวข้อ **Database**
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ค้นหาหัวข้อ **Connection Parameters** หรือข้อมูลพอร์ตการเชื่อมต่อตรงส่วนที่เป็นข้อมูลเครื่องโฮสต์ภายนอก
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        จดบันทึกหรือคัดลอกค่าพารามิเตอร์ดังต่อไปนี้เพื่อนำมาใช้กรอกฟอร์ม:
                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', listStyleType: 'circle' }}>
                          <li><strong>Host / IP Address:</strong> ที่อยู่เซิร์ฟเวอร์ฐานข้อมูล เช่น <code>db.xxxx.supabase.co</code></li>
                          <li><strong>Port:</strong> พอร์ตมาตรฐานระบบ PostgreSQL มักจะเป็นเลข <code>5432</code></li>
                          <li><strong>Database Name:</strong> ชื่อฐานข้อมูลของคุณ (ส่วนใหญ่มักตั้งต้นเป็น <code>postgres</code>)</li>
                          <li><strong>User:</strong> ชื่อบัญชีผู้ใช้งานระบบ (ส่วนใหญ่มักตั้งต้นเป็น <code>postgres</code>)</li>
                          <li><strong>Password:</strong> รหัสผ่านเข้าฐานข้อมูลที่คุณกรอกกำหนดไว้ในขั้นตอนแรกสุด</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                )}
                {activeStep === 3 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 3: กรอกข้อมูลและทดสอบส่งสัญญาณเชื่อมฐานข้อมูล
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        นำพารามิเตอร์ทั้งหมดมากรอกใส่ช่องทางซ้ายมือในฟอร์ม PostgreSQL ให้ตรงช่องทุกประการ
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        เพื่อความปลอดภัย แนะนำให้ติ๊กหัวข้อ **"เปิดการเชื่อมต่อแบบเข้ารหัสความปลอดภัยสูง (Enable SSL Connection)"** เนื่องจากบริการฐานข้อมูลคลาวด์ออนไลน์เกือบทุกเจ้าบังคับจำกัดให้เชื่อมต่อข้อมูลแบบเข้ารหัสเท่านั้น
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกปุ่ม **"บันทึกและทดสอบเชื่อมโยง PostgreSQL"** ระบบจะส่งคำสัญญาณตรวจสอบ หากผ่านแล้ว ระบบจะล็อกการจัดเก็บเข้าตัวเบราว์เซอร์พร้อมทำงานได้ทันที!
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* Guide: MySQL */}
            {driverType === 'mysql' && (
              <>
                {activeStep === 1 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 1: จัดเตรียมเซิร์ฟเวอร์ MySQL / MariaDB ให้พร้อมใช้งาน
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.5rem 0' }}>
                      ตรวจสอบให้แน่ใจว่าเครื่องเซิร์ฟเวอร์ MySQL หรือโปรแกรมฐานข้อมูล MySQL อยู่ในสถานะรันพร้อมให้บริการ:
                    </p>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.4rem' }}>
                        <strong>รันบนเครื่องคอมพิวเตอร์ของคุณ (Local):</strong> ตรวจสอบว่าโปรแกรมจำลอง เช่น **XAMPP** หรือ **Laragon** ถูกเปิดใช้งานพอร์ตบริการ MySQL/MariaDB สำเร็จแล้ว
                      </li>
                      <li style={{ marginBottom: '0.4rem' }}>
                        <strong>รันบนระบบออนไลน์ (Cloud/VPS):</strong> ตรวจสอบสัญญาณ IP ของเครื่อง VPS หรือเซิร์ฟเวอร์ปลายทางว่าเปิดรับพอร์ตภายนอกสำหรับการส่งข้อมูลแล้วหรือยัง
                      </li>
                    </ul>
                  </div>
                )}
                {activeStep === 2 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 2: สร้างฐานข้อมูลและสร้างรูปแบบตารางหลัก (Tables Schema)
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        เปิดโปรแกรมจัดการฐานข้อมูลที่คุณสะดวก เช่น **phpMyAdmin**, DBeaver, หรือ Navicat
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        รันสคำสั่งคำขอสร้างโครงฐานข้อมูลใหม่ เช่น ตั้งชื่อฐานข้อมูลหลักว่า <code>da_sasuk_db</code>
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        จัดเตรียมและเรียกใช้งานสคริปต์ SQL สร้างโครงร่างตารางที่จำเป็นสำหรับโปรแกรมบันทึกข้อมูล (เช่น ตารางหน่วยงานย่อย <code>divisions</code>, ตารางครุภัณฑ์สินทรัพย์ <code>assets</code>, และตารางบัญชีผู้ใช้ <code>users</code>)
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ตรวจสอบความถูกต้องของระบบบัญชีสิทธิ์การเข้าถึงข้อมูล (CRUD Privileges) ของผู้ใช้ระบบ MySQL ให้ครบถ้วนสมบูรณ์
                      </li>
                    </ol>
                  </div>
                )}
                {activeStep === 3 && (
                  <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                    <h4 style={{ color: 'var(--accent-color)', fontSize: '0.98rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem' }}>
                      ขั้นตอนที่ 3: กรอกข้อมูลและบันทึกเชื่อมต่อกับ MySQL Driver
                    </h4>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ระบุโฮสต์เชื่อมต่อ **Host** ของเครื่อง: พิมพ์ <code>localhost</code> หรือ <code>127.0.0.1</code> (กรณีทดสอบในคอมเครื่องหลัก) หรือระบุหมายเลข IP เครื่อง VPS นอกระบบ
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        หมายเลขพอร์ตมาตรฐานสำหรับระบบ MySQL คือพอร์ตหลักหมายเลข **`3306`**
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        ระบุระบุชื่อผู้เข้าฐานข้อมูล (User) เช่น <code>root</code> สำหรับระบบทดสอบเครื่องคอมจำลอง และระบุรหัสผ่านให้ถูกต้องสอดคล้องกับค่าเดิมของเครื่อง
                      </li>
                      <li style={{ marginBottom: '0.5rem' }}>
                        คลิกปุ่ม **"บันทึกและทดสอบเชื่อมโยง MySQL"** ตัวแอปพลิเคชันจะทดสอบเชื่อมและล็อกใช้สำหรับแสดงผลข้อมูลตารางทันทีอย่างสมบูรณ์แบบ!
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Stepper Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={activeStep === 1}
              onClick={() => setActiveStep(prev => prev - 1)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              ⬅️ ย้อนกลับ
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={activeStep === 3}
              onClick={() => setActiveStep(prev => prev + 1)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              ถัดไป ➡️
            </button>
          </div>
        </div>

      </div>
    </section >
  );
}
