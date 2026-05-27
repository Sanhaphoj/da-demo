'use client';

import React, { useState, useEffect } from 'react';
import { hashPassword, validatePasswordStrength } from '../lib/crypto';
import { showToast } from '../lib/toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AuthScreen({ onLoginSuccess, divisions = [], firestoreDb, isFirebaseConnected }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRemember, setLoginRemember] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [registerName, setRegisterName] = useState('');
  const [registerDivision, setRegisterDivision] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Password Strength State
  const [passwordStrength, setPasswordStrength] = useState({
    requirements: { length: false, upper: false, lower: false, number: false, special: false },
    score: 0,
    text: 'ความปลอดภัยรหัสผ่าน: ยังไม่ได้ระบุ',
    color: 'var(--text-muted)'
  });

  // Calculate password strength in real time
  useEffect(() => {
    if (!registerPassword) {
      setPasswordStrength({
        requirements: { length: false, upper: false, lower: false, number: false, special: false },
        score: 0,
        text: 'ความปลอดภัยรหัสผ่าน: ยังไม่ได้ระบุ',
        color: 'var(--text-muted)'
      });
      return;
    }

    const { requirements, score } = validatePasswordStrength(registerPassword);
    let color = '';
    let text = '';
    if (score <= 1) {
      color = '#ef4444';
      text = 'ความปลอดภัยรหัสผ่าน: อ่อนมาก (Very Weak)';
    } else if (score <= 3) {
      color = '#f59e0b';
      text = 'ความปลอดภัยรหัสผ่าน: ปานกลาง (Medium)';
    } else if (score === 4) {
      color = '#10b981';
      text = 'ความปลอดภัยรหัสผ่าน: แข็งแกร่ง (Strong)';
    } else {
      color = '#059669';
      text = 'ความปลอดภัยรหัสผ่าน: ปลอดภัยสูง (Very Secure)';
    }

    setPasswordStrength({ requirements, score, text, color });
  }, [registerPassword]);

  // Is registration button disabled?
  const isRegisterDisabled = !(
    registerPassword &&
    registerConfirmPassword &&
    registerPassword === registerConfirmPassword &&
    passwordStrength.score === 5 &&
    registerName &&
    registerDivision &&
    registerEmail
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    if (!email || !password) {
      showToast("กรุณากรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน", "warning");
      return;
    }

    try {
      const hashedPassword = await hashPassword(password);
      
      // Fetch users from localStorage
      const localUsersStr = localStorage.getItem('da_users');
      const users = localUsersStr ? JSON.parse(localUsersStr) : [];

      const foundUser = users.find(u => u.email === email && u.password === hashedPassword);
      if (!foundUser) {
        showToast("อีเมลผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", "error");
        return;
      }

      // If user checked "remember", save session in localStorage, otherwise sessionStorage
      const userJson = JSON.stringify(foundUser);
      if (loginRemember) {
        localStorage.setItem('da_current_user', userJson);
      } else {
        sessionStorage.setItem('da_current_user', userJson);
      }

      showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${foundUser.name}`, "success");
      onLoginSuccess(foundUser);
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเข้าสู่ระบบ", "error");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerName || !registerDivision || !registerEmail || !registerPassword) {
      showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "warning");
      return;
    }

    if (passwordStrength.score < 5) {
      showToast("รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัยมาตรฐานขั้นสูง", "error");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      showToast("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน", "error");
      return;
    }

    try {
      const email = registerEmail.trim().toLowerCase();
      
      // Fetch existing users to check duplicate
      let users = [];
      const localUsersStr = localStorage.getItem('da_users');
      if (localUsersStr) {
        try {
          users = JSON.parse(localUsersStr);
        } catch (err) {
          users = [];
        }
      }

      if (users.some(u => u.email === email)) {
        showToast("อีเมลผู้ใช้งานนี้ถูกสมัครสมาชิกในระบบไว้แล้ว", "error");
        return;
      }

      const hashedPassword = await hashPassword(registerPassword);
      const newUser = {
        name: registerName.trim(),
        divisionId: registerDivision,
        email,
        password: hashedPassword,
        role: "viewer" // Registered accounts always default to viewer
      };

      // Save user locally first
      const updatedUsers = [...users, newUser];
      localStorage.setItem('da_users', JSON.stringify(updatedUsers));

      // Sync to Firebase if connected
      if (isFirebaseConnected && firestoreDb) {
        const docRef = doc(firestoreDb, "durable_articles_sys", "office_state");
        
        // Fetch current snapshot to merge users instead of overwriting!
        // This is a CRITICAL BUG FIX so registered users aren't deleted!
        const docSnap = await getDoc(docRef);
        let cloudUsers = [];
        let mergedDivisions = [];
        let mergedAssets = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          cloudUsers = data.users || [];
          mergedDivisions = data.divisions || [];
          mergedAssets = data.assets || [];
        }

        const cloudEmails = new Set(cloudUsers.map(u => u.email));
        const onlyLocal = updatedUsers.filter(u => !cloudEmails.has(u.email));
        const mergedUsers = [...cloudUsers, ...onlyLocal];

        await setDoc(docRef, {
          divisions: mergedDivisions,
          assets: mergedAssets,
          users: mergedUsers,
          updatedAt: new Date().toISOString()
        });
      }

      showToast("สมัครสมาชิกใหม่สำเร็จเรียบร้อย! กรุณาเข้าสู่ระบบด้วยสิทธิ์ผู้เข้าชม (viewer)", "success");

      // Reset Register Fields & Switch to Login
      setLoginEmail(email);
      setLoginPassword('');
      setRegisterName('');
      setRegisterDivision('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setActiveTab('login');
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการลงทะเบียน", "error");
    }
  };

  return (
    <div className="auth-screen" id="auth-screen" style={{ display: 'flex' }}>
      <div className={`auth-card ${activeTab === 'register' ? 'register-wide' : ''}`}>
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </div>
          <h2>ระบบจัดการครุภัณฑ์สำนัก</h2>
          <p>สำนักงานสาธารณสุขและสิ่งแวดล้อม เทศบาลนครยะลา</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} 
            onClick={() => setActiveTab('login')}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} 
            onClick={() => setActiveTab('register')}
          >
            สมัครสมาชิก
          </button>
        </div>

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form id="login-form" className="auth-form active" onSubmit={handleLoginSubmit}>
            <div className="auth-input-wrapper">
              <label htmlFor="login-email">อีเมลผู้ใช้งาน *</label>
              <div className="input-icon-container">
                <svg className="input-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                <input 
                  type="email" 
                  id="login-email" 
                  className="auth-input" 
                  placeholder="example@sasuk.go.th" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="auth-input-wrapper">
              <label htmlFor="login-password">รหัสผ่าน *</label>
              <div className="input-icon-container">
                <svg className="input-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  id="login-password" 
                  className="auth-input" 
                  placeholder="••••••••" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required 
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  <svg viewBox="0 0 24 24" className="eye-icon"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  id="login-remember" 
                  checked={loginRemember}
                  onChange={(e) => setLoginRemember(e.target.checked)}
                />
                <span>จดจำฉันในระบบ</span>
              </label>
            </div>

            <button type="submit" className="btn-auth-submit" id="login-submit-btn">เข้าสู่ระบบ</button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === 'register' && (
          <form id="register-form" className="auth-form active" onSubmit={handleRegisterSubmit}>
            <div className="auth-form-columns">
              <div className="auth-column">
                <div className="auth-input-wrapper">
                  <label htmlFor="register-name">ชื่อ-นามสกุลจริง *</label>
                  <div className="input-icon-container">
                    <svg className="input-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                    <input 
                      type="text" 
                      id="register-name" 
                      className="auth-input" 
                      placeholder="นายสุขใจ ทะเบียนครุภัณฑ์" 
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="auth-input-wrapper">
                  <label htmlFor="register-division">ฝ่ายงานที่สังกัด *</label>
                  <div className="input-icon-container">
                    <svg className="input-icon" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" /></svg>
                    <select 
                      id="register-division" 
                      className="auth-input-select" 
                      value={registerDivision}
                      onChange={(e) => setRegisterDivision(e.target.value)}
                      required
                    >
                      <option value="">-- เลือกฝ่ายงานที่สังกัด --</option>
                      {divisions.map(div => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="auth-input-wrapper">
                  <label htmlFor="register-email">อีเมลผู้ใช้งาน (ใช้เพื่อเข้าสู่ระบบ) *</label>
                  <div className="input-icon-container">
                    <svg className="input-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                    <input 
                      type="email" 
                      id="register-email" 
                      className="auth-input" 
                      placeholder="admin@sasuk.go.th" 
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="auth-column">
                <div className="auth-input-wrapper">
                  <label htmlFor="register-password">รหัสผ่านสำหรับเข้าสู่ระบบ *</label>
                  <div className="input-icon-container">
                    <svg className="input-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                    <input 
                      type={showRegisterPassword ? "text" : "password"} 
                      id="register-password" 
                      className="auth-input" 
                      placeholder="••••••••" 
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required 
                      autoComplete="new-password"
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    >
                      <svg viewBox="0 0 24 24" className="eye-icon"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    </button>
                  </div>
                  
                  {/* Password Strength Meter */}
                  <div className="strength-meter-container">
                    <div className="strength-meter-bar">
                      <div 
                        className="strength-meter-progress" 
                        id="strength-bar-progress"
                        style={{ width: `${(passwordStrength.score / 5) * 100}%`, background: passwordStrength.color }}
                      ></div>
                    </div>
                    <span className="strength-meter-text" id="strength-bar-text" style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>

                  {/* Password Checklist */}
                  <div className="password-requirements">
                    <div className={`requirement-item ${passwordStrength.requirements.length ? 'valid' : ''}`} id="req-length">
                      <span className="req-icon">{passwordStrength.requirements.length ? '🟢' : '❌'}</span> ความยาวอย่างน้อย 8 ตัวอักษร
                    </div>
                    <div className={`requirement-item ${passwordStrength.requirements.upper ? 'valid' : ''}`} id="req-upper">
                      <span className="req-icon">{passwordStrength.requirements.upper ? '🟢' : '❌'}</span> มีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว
                    </div>
                    <div className={`requirement-item ${passwordStrength.requirements.lower ? 'valid' : ''}`} id="req-lower">
                      <span className="req-icon">{passwordStrength.requirements.lower ? '🟢' : '❌'}</span> มีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว
                    </div>
                    <div className={`requirement-item ${passwordStrength.requirements.number ? 'valid' : ''}`} id="req-number">
                      <span className="req-icon">{passwordStrength.requirements.number ? '🟢' : '❌'}</span> มีตัวเลข (0-9) อย่างน้อย 1 ตัว
                    </div>
                    <div className={`requirement-item ${passwordStrength.requirements.special ? 'valid' : ''}`} id="req-special">
                      <span className="req-icon">{passwordStrength.requirements.special ? '🟢' : '❌'}</span> มีอักขระพิเศษ (เช่น @, $, !, %, *, #, ?, &) อย่างน้อย 1 ตัว
                    </div>
                  </div>
                </div>

                <div className="auth-input-wrapper">
                  <label htmlFor="register-confirm-password">ยืนยันรหัสผ่านอีกครั้ง *</label>
                  <div className="input-icon-container">
                    <svg className="input-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                    <input 
                      type={showRegisterConfirmPassword ? "text" : "password"} 
                      id="register-confirm-password" 
                      className="auth-input" 
                      placeholder="••••••••" 
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required 
                      autoComplete="new-password"
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                    >
                      <svg viewBox="0 0 24 24" className="eye-icon"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" id="register-submit-btn" disabled={isRegisterDisabled}>
              สมัครสมาชิกใหม่
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
