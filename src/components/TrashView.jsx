'use client';

import React, { useMemo, useState } from 'react';
import { getCategoryLabel } from '../lib/compliance';
import { showToast } from '../lib/toast';

export default function TrashView({ trashAssets = [], divisions = [], onRestore, onPermanentDelete }) {
  const [filterSearch, setFilterSearch] = useState('');

  // Calculate clean remaining days and list
  const processedTrash = useMemo(() => {
    const now = new Date();
    return trashAssets.map(asset => {
      const deletedDate = new Date(asset.deletedAt);
      const diffTime = now - deletedDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 10 - diffDays);

      return {
        ...asset,
        daysRemaining
      };
    }).filter(asset => {
      // Apply basic search filter
      const q = filterSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.assetCode.toLowerCase().includes(q) ||
        asset.owner.toLowerCase().includes(q)
      );
    });
  }, [trashAssets, filterSearch]);

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.';
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <section className="view-section">
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            width: '45px',
            height: '45px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            🗑️
          </div>
          <div>
            <h2 className="section-title">ถังขยะระบบครุภัณฑ์</h2>
            <p className="section-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              รายการครุภัณฑ์ที่ถูกลบจะคงอยู่ในถังขยะเป็นเวลา **10 วัน** เพื่อกู้ข้อมูลกลับคืนได้ หลังจากนั้นจะถูกลบถาวรโดยอัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="filter-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
            <input
              type="text"
              className="form-control search-input"
              placeholder="🔍 ค้นหาในถังขยะ ด้วยชื่อ เลขครุภัณฑ์ หรือผู้ดูแล..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ครุภัณฑ์ในถังขยะทั้งหมด: <strong>{trashAssets.length} รายการ</strong>
          </div>
        </div>
      </div>

      {/* TRASH ARTICLES TABLE */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>เลขครุภัณฑ์</th>
                <th>ชื่อรายการครุภัณฑ์</th>
                <th>หมวดหมู่</th>
                <th>ฝ่าย / กลุ่มงานเดิม</th>
                <th>วันที่ลบ</th>
                <th style={{ textAlign: 'center' }}>เวลาคงเหลือ</th>
                <th style={{ textAlign: 'center' }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {processedTrash.map(asset => {
                const div = divisions.find(d => d.id === asset.divisionId);
                const sub = div ? div.subgroups.find(s => s.id === asset.subgroupId) : null;

                // Determine remaining days badge style
                let badgeClass = 'badge badge-success';
                let countdownText = `⏳ เหลืออีก ${asset.daysRemaining} วัน`;
                if (asset.daysRemaining <= 2) {
                  badgeClass = 'badge badge-error';
                  countdownText = `🚨 เหลืออีก ${asset.daysRemaining} วันสุดท้าย!`;
                } else if (asset.daysRemaining <= 5) {
                  badgeClass = 'badge badge-warning';
                  countdownText = `⏳ เหลืออีก ${asset.daysRemaining} วัน`;
                }

                return (
                  <tr key={asset.id}>
                    <td><span className="asset-code">{asset.assetCode}</span></td>
                    <td style={{ fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {asset.image && (
                          <img
                            src={asset.image}
                            alt={asset.name}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-color)',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <span>{asset.name}</span>
                      </div>
                    </td>
                    <td>{getCategoryLabel(asset.category)}</td>
                    <td>
                      <div>
                        <strong>{div ? div.name : 'ไม่พบฝ่าย'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub ? sub.name : 'ไม่พบกลุ่มงาน'}</div>
                      </div>
                    </td>
                    <td>{formatDateThai(asset.deletedAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={badgeClass} style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}>
                        {countdownText}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          className="btn-secondary"
                          title="กู้คืนข้อมูลครุภัณฑ์"
                          onClick={() => onRestore(asset.id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          🟢 กู้คืนข้อมูล
                        </button>
                        <button
                          className="btn-secondary"
                          title="ลบพัสดุถาวร"
                          onClick={() => onPermanentDelete(asset.id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'var(--color-error-bg)',
                            color: 'var(--color-error)',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          ❌ ลบถาวร
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedTrash.length === 0 && (
          <div className="empty-state" style={{ padding: '3rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3>ไม่มีรายการครุภัณฑ์ในถังขยะ</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              ครุภัณฑ์ที่ถูกลบในช่วง 10 วันล่าสุดจะปรากฏที่นี่เพื่อรอการกู้คืน
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
