'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { checkPriceCompliance } from '../lib/compliance';

export default function DashboardView({ assets = [], theme }) {
  const categoryChartRef = useRef(null);
  const complianceChartRef = useRef(null);

  const categoryChartInstance = useRef(null);
  const complianceChartInstance = useRef(null);

  // 1. Calculations for KPIs
  const totalCount = assets.length;
  
  const totalValue = assets.reduce((sum, a) => sum + Number(a.unitPrice || 0), 0);

  // Check compliance status
  let compliantCount = 0;
  let overCount = 0;
  let customCount = 0;
  let totalOverBudgetValue = 0;

  assets.forEach(a => {
    const comp = checkPriceCompliance(a.category, a.standardItemId, a.unitPrice);
    if (comp.status === 'compliant') {
      compliantCount++;
    } else if (comp.status === 'over') {
      overCount++;
      totalOverBudgetValue += comp.difference;
    } else {
      customCount++;
    }
  });

  const complianceRate = totalCount > 0 
    ? Math.round(((compliantCount) / (totalCount)) * 100) 
    : 0;

  // 2. Chart Drawing Effect
  useEffect(() => {
    const isLight = theme === 'light';
    const textColor = isLight ? '#0f172a' : '#f9fafb';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

    // Category Spending Stats
    const categoryStats = { computer: 0, office: 0, vehicle: 0, science: 0, construction: 0, agriculture: 0, other: 0 };
    assets.forEach(a => {
      if (categoryStats[a.category] !== undefined) {
        categoryStats[a.category] += Number(a.unitPrice || 0);
      } else {
        categoryStats.other += Number(a.unitPrice || 0);
      }
    });

    // Destroy previous charts before creating new ones to prevent overlaps
    if (categoryChartInstance.current) categoryChartInstance.current.destroy();
    if (complianceChartInstance.current) complianceChartInstance.current.destroy();

    // Create Category Spending Chart
    if (categoryChartRef.current) {
      const catCtx = categoryChartRef.current.getContext('2d');
      categoryChartInstance.current = new Chart(catCtx, {
        type: 'bar',
        data: {
          labels: [
            'ครุภัณฑ์คอมพิวเตอร์',
            'ครุภัณฑ์สำนักงาน',
            'ครุภัณฑ์ยานพาหนะ',
            'ครุภัณฑ์วิทย์/แพทย์',
            'ครุภัณฑ์ก่อสร้าง',
            'ครุภัณฑ์การเกษตร',
            'ครุภัณฑ์อื่นๆ'
          ],
          datasets: [{
            label: 'มูลค่ารวม (บาท)',
            data: [
              categoryStats.computer,
              categoryStats.office,
              categoryStats.vehicle,
              categoryStats.science,
              categoryStats.construction,
              categoryStats.agriculture,
              categoryStats.other
            ],
            backgroundColor: [
              'rgba(99, 102, 241, 0.75)',
              'rgba(59, 130, 246, 0.75)',
              'rgba(16, 185, 129, 0.75)',
              'rgba(245, 158, 11, 0.75)',
              'rgba(236, 72, 153, 0.75)',
              'rgba(20, 184, 166, 0.75)',
              'rgba(156, 163, 175, 0.75)'
            ],
            borderColor: [
              '#6366f1',
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#ec4899',
              '#14b8a6',
              '#9ca3af'
            ],
            borderWidth: 1.5,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              padding: 10,
              bodyFont: { family: 'Prompt' },
              titleFont: { family: 'Prompt', weight: 'bold' }
            }
          },
          scales: {
            x: {
              ticks: { color: textColor, font: { family: 'Prompt', size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: textColor, font: { family: 'Inter' } },
              grid: { color: gridColor }
            }
          }
        }
      });
    }

    // Create Compliance Doughnut Chart
    if (complianceChartRef.current) {
      const compCtx = complianceChartRef.current.getContext('2d');
      complianceChartInstance.current = new Chart(compCtx, {
        type: 'doughnut',
        data: {
          labels: ['ตรงมาตรฐาน', 'สูงกว่ามาตรฐาน', 'นอกเกณฑ์'],
          datasets: [{
            data: [compliantCount, overCount, customCount],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: {
              bodyFont: { family: 'Prompt' },
              titleFont: { family: 'Prompt' }
            }
          }
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();
      if (complianceChartInstance.current) complianceChartInstance.current.destroy();
    };
  }, [assets, theme, compliantCount, overCount, customCount]);

  // Format currency helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="view-dashboard" className="view-container active">
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">ครุภัณฑ์ทั้งหมด</span>
            <div className="kpi-icon primary">
              <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
            </div>
          </div>
          <div className="kpi-value" id="kpi-total-count">{totalCount}</div>
          <div className="kpi-subtext">สินทรัพย์รอการเบิกจ่าย/ใช้งานปกติ</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">มูลค่าครุภัณฑ์รวม</span>
            <div className="kpi-icon success">
              <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 1.21-1.04 1.93-2.7 1.93-1.96 0-2.74-1.14-2.84-2.4H6.19c.1 2.42 1.91 3.62 3.81 4.13V21h3v-2.15c2-.38 3.5-1.5 3.5-3.67 0-2.94-2.42-3.68-4.89-4.28z"/></svg>
            </div>
          </div>
          <div className="kpi-value" id="kpi-total-value">{formatCurrency(totalValue)}</div>
          <div className="kpi-subtext">อิงตามงบประมาณการจัดซื้อจริง</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">อัตราตามราคามาตรฐาน</span>
            <div className="kpi-icon warning">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
          </div>
          <div className="kpi-value" id="kpi-compliance-rate">{complianceRate}%</div>
          <div className="kpi-subtext">ตรงตามเกณฑ์สูงสุดสำนักงบประมาณ</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">เกินเกณฑ์มาตรฐาน</span>
            <div className="kpi-icon error">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
          </div>
          <div className="kpi-value" id="kpi-over-budget-count">{overCount}</div>
          <div className="kpi-subtext">มูลค่าส่วนเกินรวม: <strong id="kpi-over-budget-value">{formatCurrency(totalOverBudgetValue)}</strong></div>
        </div>
      </div>

      {/* Dashboard Charts Layout */}
      <div className="dashboard-grid">
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">สถิติมูลค่าครุภัณฑ์แยกตามหมวดหมู่</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>เปรียบเทียบงบประมาณแต่ละกลุ่ม</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <canvas ref={categoryChartRef} id="categoryChart"></canvas>
          </div>
        </div>

        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">สัดส่วนราคามาตรฐาน</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>เปอร์เซ็นต์ตามเกณฑ์งบประมาณ</p>
            </div>
          </div>
          <div className="chart-wrapper" style={{ height: '180px' }}>
            <canvas ref={complianceChartRef} id="complianceChart"></canvas>
          </div>
          <div className="compliance-summary-list">
            <div className="compliance-summary-item">
              <div className="compliance-status-label">
                <span className="status-dot success"></span>
                <span>ตรงตามเกณฑ์มาตรฐาน</span>
              </div>
              <strong id="summary-compliant-count">{compliantCount} รายการ</strong>
            </div>
            <div className="compliance-summary-item">
              <div className="compliance-status-label">
                <span className="status-dot error"></span>
                <span>สูงกว่าราคามาตรฐาน</span>
              </div>
              <strong id="summary-over-count">{overCount} รายการ</strong>
            </div>
            <div className="compliance-summary-item">
              <div className="compliance-status-label">
                <span className="status-dot warning"></span>
                <span>นอกเกณฑ์ราคามาตรฐาน</span>
              </div>
              <strong id="summary-custom-count">{customCount} รายการ</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
