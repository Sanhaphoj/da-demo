'use client';

import React, { useState, useMemo } from 'react';
import { showToast } from '../lib/toast';

export default function OrgView({ divisions = [], assets = [], currentUser, onSaveDivisions }) {
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisions[0]?.id || 'admin');
  const [newDivName, setNewDivName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // Find currently active division
  const activeDivision = useMemo(() => {
    return divisions.find(d => d.id === selectedDivisionId) || divisions[0];
  }, [divisions, selectedDivisionId]);

  // Compute statistics for active division
  const activeDivStats = useMemo(() => {
    if (!activeDivision) return { count: 0, value: 0 };
    const divAssets = assets.filter(a => a.divisionId === activeDivision.id);
    const sumValue = divAssets.reduce((sum, a) => sum + Number(a.unitPrice || 0), 0);
    return { count: divAssets.length, value: sumValue };
  }, [activeDivision, assets]);

  // Add dynamic Main Division (Super Admin only)
  const handleAddDivision = (e) => {
    e.preventDefault();
    if (currentUser.role !== 'super admin') {
      showToast("เฉพาะผู้ดูแลระบบระดับสูง (Super Admin) เท่านั้นที่สามารถเพิ่มฝ่ายงานหลักได้", "error");
      return;
    }

    const name = newDivName.trim();
    if (!name) return;

    const newId = `div-${Date.now()}`;
    const updated = [
      ...divisions,
      {
        id: newId,
        name: name,
        subgroups: []
      }
    ];

    onSaveDivisions(updated);
    setNewDivName('');
    setSelectedDivisionId(newId); // auto-focus newly created division
    showToast(`เพิ่มฝ่ายงานหลัก "${name}" เรียบร้อยแล้ว`, "success");
  };

  // Add dynamic Subgroup (Super Admin or Admin in their own division)
  const handleAddSubgroup = (e) => {
    e.preventDefault();
    if (currentUser.role === 'viewer') {
      showToast("คุณไม่มีสิทธิ์ในการเพิ่มกลุ่มงานย่อย", "error");
      return;
    }

    if (currentUser.role === 'admin' && selectedDivisionId !== currentUser.divisionId) {
      showToast("คุณสามารถเพิ่มกลุ่มงานย่อยในฝ่ายงานของตนเองเท่านั้น", "error");
      return;
    }

    const name = newSubName.trim();
    if (!name) return;

    const updated = divisions.map(div => {
      if (div.id === selectedDivisionId) {
        return {
          ...div,
          subgroups: [
            ...div.subgroups,
            {
              id: `sub-${Date.now()}`,
              name: name
            }
          ]
        };
      }
      return div;
    });

    onSaveDivisions(updated);
    setNewSubName('');
    showToast(`เพิ่มกลุ่มงานย่อย "${name}" เรียบร้อยแล้ว`, "success");
  };

  // Delete Subgroup
  const handleDeleteSubgroup = async (subId) => {
    if (currentUser.role === 'viewer') {
      showToast("คุณไม่มีสิทธิ์ในการลบกลุ่มงานย่อย", "error");
      return;
    }

    if (currentUser.role === 'admin' && selectedDivisionId !== currentUser.divisionId) {
      showToast("คุณสามารถลบกลุ่มงานย่อยในฝ่ายงานของตนเองเท่านั้น", "error");
      return;
    }

    // Check if subgroup has registered assets
    const hasAssets = assets.some(a => a.divisionId === selectedDivisionId && a.subgroupId === subId);
    if (hasAssets) {
      showToast("ไม่สามารถลบกลุ่มงานนี้ได้ เนื่องจากมีครุภัณฑ์ผูกติดอยู่ กรุณาย้ายครุภัณฑ์ออกก่อน", "error");
      return;
    }

    if (window.confirm("คุณแน่ใจว่าต้องการลบกลุ่มงานย่อยนี้ใช่หรือไม่?")) {
      const updated = divisions.map(div => {
        if (div.id === selectedDivisionId) {
          return {
            ...div,
            subgroups: div.subgroups.filter(s => s.id !== subId)
          };
        }
        return div;
      });

      onSaveDivisions(updated);
      showToast("ลบกลุ่มงานย่อยสำเร็จแล้ว", "info");
    }
  };

  // UI helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  const isSuperAdmin = currentUser.role === 'super admin';
  const isAdminInThisDiv = currentUser.role === 'admin' && selectedDivisionId === currentUser.divisionId;
  const canAddSubgroup = isSuperAdmin || isAdminInThisDiv;

  return (
    <section id="view-org" className="view-container active">
      <div className="org-container">
        
        {/* Left Column: Divisions directory list */}
        <div className="org-card">
          <div className="card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 className="card-title">ผังโครงสร้างกลุ่มงาน</h3>
          </div>
          
          <div className="org-tree" id="divisions-tree-container">
            {divisions.map(div => {
              const isActive = selectedDivisionId === div.id;
              const count = assets.filter(a => a.divisionId === div.id).length;

              return (
                <div 
                  key={div.id} 
                  className={`org-division-node ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDivisionId(div.id)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.02)',
                    color: isActive ? '#ffffff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    marginBottom: '0.6rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🏢</span>
                    <strong style={{ fontSize: '0.92rem' }}>{div.name}</strong>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '10px'
                  }}>
                    {count} รายการ
                  </span>
                </div>
              );
            })}
          </div>

          {/* Super Admin Division Append Field */}
          {isSuperAdmin && (
            <form 
              onSubmit={handleAddDivision}
              style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap' }}>🏢 เพิ่มฝ่ายระดับสำนัก</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexGrow: 1, maxWidth: '320px' }}>
                <input 
                  type="text" 
                  id="new-div-name" 
                  className="form-control" 
                  placeholder="ระบุชื่อฝ่าย/กลุ่มยุทธศาสตร์..." 
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', height: '36px' }}
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 1rem', fontSize: '0.82rem', height: '36px', whiteSpace: 'nowrap' }}>เพิ่ม</button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Dynamic sub-departments controls */}
        {activeDivision && (
          <div className="org-card" id="division-detail-card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title" id="selected-div-title">{activeDivision.name}</h3>
                <p id="selected-div-stats" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {`รวม: ${activeDivStats.count} ครุภัณฑ์ | มูลค่าสะสม: ${formatCurrency(activeDivStats.value)}`}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>กลุ่มงานย่อยในฝ่ายงานนี้</h4>
              <div id="subgroups-detail-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeDivision.subgroups.length === 0 && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    ยังไม่มีกลุ่มงานย่อยเพิ่มไว้ในฝ่ายงานนี้
                  </div>
                )}
                {activeDivision.subgroups.map(sub => {
                  const count = assets.filter(a => a.divisionId === activeDivision.id && a.subgroupId === sub.id).length;
                  return (
                    <div 
                      key={sub.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.86rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔹</span>
                        <span>{sub.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({count} รายการ)</span>
                      </div>
                      
                      {/* Delete option for authorized Admins */}
                      {canAddSubgroup && (
                        <button 
                          className="btn-icon delete" 
                          title="ลบกลุ่มย่อย"
                          onClick={() => handleDeleteSubgroup(sub.id)}
                          style={{ width: '26px', height: '26px' }}
                        >
                          <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subgroup append field */}
            {canAddSubgroup && (
              <form 
                onSubmit={handleAddSubgroup}
                style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
              >
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap' }}>➕ เพิ่มกลุ่มงานย่อยใหม่</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexGrow: 1, maxWidth: '320px' }}>
                  <input 
                    type="text" 
                    id="new-sub-name" 
                    className="form-control" 
                    placeholder="ระบุชื่อกลุ่มงาน/ธุรการย่อย..." 
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', height: '36px' }}
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0 1rem', fontSize: '0.82rem', height: '36px', whiteSpace: 'nowrap' }}>เพิ่ม</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
