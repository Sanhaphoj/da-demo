'use client';

import React, { useState, useMemo } from 'react';
import { hashPassword } from '../lib/crypto';
import { showToast } from '../lib/toast';

export default function UsersView({ users = [], divisions = [], currentUser, onSaveUsers }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdTargetEmail, setPwdTargetEmail] = useState('');
  const [pwdTargetName, setPwdTargetName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Compute filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, searchQuery]);

  // Handle user role change
  const handleRoleChange = async (email, newRole) => {
    if (email === currentUser.email) {
      showToast('คุณไม่สามารถเปลี่ยนบทบาทสิทธิ์ของตนเองได้', 'error');
      return;
    }

    const targetUser = users.find(u => u.email === email);
    if (targetUser && targetUser.role === 'super admin') {
      showToast('คุณไม่สามารถเปลี่ยนบทบาทสิทธิ์ของ Super Admin ท่านอื่นได้เพื่อความปลอดภัยระดับสูงสุด', 'error');
      return;
    }

    if (window.confirm(`คุณแน่ใจว่าต้องการเปลี่ยนบทบาทสิทธิ์ของ ${email} เป็น ${newRole} หรือไม่?`)) {
      const updated = users.map(u => {
        if (u.email === email) {
          return { ...u, role: newRole };
        }
        return u;
      });
      onSaveUsers(updated);
      showToast('ปรับระดับสิทธิ์ผู้ใช้งานสำเร็จแล้ว', 'success');
    }
  };

  // Open password change modal
  const handleOpenPasswordModal = (email, name) => {
    if (email !== currentUser.email) {
      const targetUser = users.find(u => u.email === email);
      if (targetUser && targetUser.role === 'super admin') {
        showToast('คุณไม่สามารถเปลี่ยนหรือแก้ไขรหัสผ่านของ Super Admin ท่านอื่นได้เพื่อความปลอดภัยระดับสูงสุด', 'error');
        return;
      }
    }

    setPwdTargetEmail(email);
    setPwdTargetName(name);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordModalOpen(true);
  };

  // Handle password change save
  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('กรุณากรอกข้อมูลรหัสผ่านให้ครบถ้วน', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('รหัสผ่านที่ยืนยันไม่ตรงกัน', 'error');
      return;
    }

    try {
      const hashedPassword = await hashPassword(newPassword);
      const updated = users.map(u => {
        if (u.email === pwdTargetEmail) {
          return { ...u, password: hashedPassword };
        }
        return u;
      });

      onSaveUsers(updated);
      showToast('เปลี่ยนรหัสผ่านผู้ใช้งานสำเร็จเรียบร้อย', 'success');
      setIsPasswordModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
    }
  };

  // Handle delete user account
  const handleDeleteUser = async (email) => {
    if (email === currentUser.email) {
      showToast('คุณไม่สามารถลบบัญชีผู้ใช้ของตัวเองได้เพื่อความปลอดภัย', 'error');
      return;
    }

    const targetUser = users.find(u => u.email === email);
    if (targetUser && targetUser.role === 'super admin') {
      showToast('คุณไม่สามารถลบบัญชีผู้ใช้ที่เป็น Super Admin ท่านอื่นได้เพื่อความปลอดภัยระดับสูงสุด', 'error');
      return;
    }

    if (window.confirm(`คุณแน่ใจว่าต้องการลบบัญชีผู้ใช้ ${email} หรือไม่? การกระทำนี้ไม่สามารถย้อนคืนได้`)) {
      const updated = users.filter(u => u.email !== email);
      onSaveUsers(updated);
      showToast('ลบบัญชีผู้ใช้งานออกจากระบบสำเร็จแล้ว', 'success');
    }
  };

  return (
    <section id="view-users" className="view-container active">
      {/* Search bar for users */}
      <div className="controls-card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="input-group" style={{ flexGrow: 1 }}>
            <label htmlFor="user-search-input">ค้นหาผู้ใช้งาน</label>
            <input 
              type="text" 
              id="user-search-input" 
              className="form-control" 
              placeholder="ค้นหาโดยระบุชื่อ หรืออีเมลผู้ดูแล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Premium Table of Users */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="premium-table" id="superadmin-users-table">
            <thead>
              <tr>
                <th>ชื่อผู้ใช้งาน</th>
                <th>อีเมลบัญชี</th>
                <th className="hide-mobile">ฝ่ายงานที่สังกัด</th>
                <th>ระดับสิทธิ์</th>
                <th style={{ textAlign: 'center' }}>จัดการระดับสิทธิ์</th>
                <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody id="superadmin-users-table-body">
              {filteredUsers.map(user => {
                const userDiv = divisions.find(d => d.id === user.divisionId);
                const divName = userDiv ? userDiv.name : "ฝ่ายงานทั่วไป";
                const isSelf = user.email === currentUser.email;
                const isOtherSuperAdmin = user.role === 'super admin' && !isSelf;

                return (
                  <tr key={user.email}>
                    <td style={{ fontWeight: 500 }}>
                      {user.name} {isSelf && <span style={{ fontWeight: 'normal', fontSize: '0.72rem', color: 'var(--accent-color)' }}>(คุณ)</span>}
                    </td>
                    <td style={{ fontFamily: 'Inter', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td className="hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{divName}</td>
                    <td>
                      <span className={`badge ${user.role === 'super admin' ? 'badge-error' : user.role === 'admin' ? 'badge-warning' : 'badge-success'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!isSelf && !isOtherSuperAdmin ? (
                        <select 
                          className="form-control superadmin-role-select" 
                          style={{ width: '140px', fontSize: '0.82rem', padding: '0.25rem 0.5rem', background: 'var(--bg-surface-hover)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', margin: 'auto' }}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.email, e.target.value)}
                        >
                          <option value="viewer">viewer</option>
                          <option value="admin">admin</option>
                          <option value="super admin">super admin</option>
                        </select>
                      ) : isSelf ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>ไม่สามารถเปลี่ยนสิทธิ์ตนเองได้</span>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>ล็อกสิทธิ์ (Super Admin)</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          className="btn-icon edit change-password-btn" 
                          title={isOtherSuperAdmin ? "ไม่สามารถแก้ไขสิทธิ์ของ Super Admin ท่านอื่นได้" : "เปลี่ยนรหัสผ่าน"}
                          disabled={isOtherSuperAdmin}
                          style={isOtherSuperAdmin ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          onClick={() => handleOpenPasswordModal(user.email, user.name)}
                        >
                          <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                        </button>
                        <button 
                          className="btn-icon delete delete-user-btn" 
                          title={isOtherSuperAdmin ? "ไม่สามารถลบ Super Admin ท่านอื่นได้" : "ลบผู้ใช้"} 
                          disabled={isSelf || isOtherSuperAdmin}
                          style={(isSelf || isOtherSuperAdmin) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          onClick={() => handleDeleteUser(user.email)}
                        >
                          <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHANGE USER PASSWORD MODAL OVERLAY */}
      {isPasswordModalOpen && (
        <div className="modal-overlay active" id="password-change-modal" style={{ display: 'flex' }}>
          <div className="modal-content confirm-modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>เปลี่ยนรหัสผ่านผู้ใช้งาน</h3>
              <button className="modal-close-btn" onClick={() => setIsPasswordModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', textAlign: 'left' }}>
              <form id="password-change-form" onSubmit={handleSavePassword}>
                <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                  <label>ผู้ใช้งาน</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    disabled 
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}
                    value={`${pwdTargetName} (${pwdTargetEmail})`}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="change-pwd-new">รหัสผ่านใหม่ *</label>
                  <input 
                    type="password" 
                    id="change-pwd-new" 
                    className="form-control" 
                    placeholder="ระบุรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร..." 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                    autoComplete="new-password"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="change-pwd-confirm">ยืนยันรหัสผ่านใหม่ *</label>
                  <input 
                    type="password" 
                    id="change-pwd-confirm" 
                    className="form-control" 
                    placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง..." 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    autoComplete="new-password"
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', background: 'transparent' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsPasswordModalOpen(false)} style={{ flex: 1, padding: '0.75rem' }}>ยกเลิก</button>
              <button type="button" className="btn-primary" onClick={handleSavePassword} style={{ flex: 1, padding: '0.75rem' }}>เปลี่ยนรหัสผ่าน</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
