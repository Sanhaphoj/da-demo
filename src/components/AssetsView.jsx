'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { checkPriceCompliance, getCategoryLabel } from '../lib/compliance';
import { standardPrices } from '../lib/standardPrices';
import { showToast } from '../lib/toast';

const getNormalizedChristianDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : (dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr);
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year > 2400) {
      year -= 543; // Convert Buddhist to Christian
    }
    return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return cleanDate;
};

export default function AssetsView({ assets = [], divisions = [], currentUser, onSaveAsset, onDeleteAsset }) {
  // Search & Filter State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterCompliance, setFilterCompliance] = useState('all');

  // Modal Asset Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAssetId, setModalAssetId] = useState(null); // null if new
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStdItem, setFormStdItem] = useState('custom');
  const [formPrice, setFormPrice] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formSubgroup, setFormSubgroup] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formStatus, setFormStatus] = useState('not_due');
  const [formNotes, setFormNotes] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPdf, setFormPdf] = useState('');
  const [formPdfName, setFormPdfName] = useState('');

  // Image Preview Lightbox State
  const [previewAsset, setPreviewAsset] = useState(null);

  // Export Excel Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPeriodType, setExportPeriodType] = useState('monthly'); // 'monthly' | 'yearly' | 'custom'
  const [exportMonth, setExportMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [exportYear, setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exportStartDate, setExportStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const availableYears = useMemo(() => {
    const years = new Set();
    years.add(new Date().getFullYear().toString());
    assets.forEach(a => {
      if (a.receivedDate) {
        const norm = getNormalizedChristianDate(a.receivedDate);
        const yr = norm.substring(0, 4);
        if (/^\d{4}$/.test(yr)) {
          years.add(yr);
        }
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [assets]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const maxBytes = 500 * 1024;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length * 0.75 > maxBytes && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const finalSizeBytes = Math.round(dataUrl.length * 0.75);
        if (finalSizeBytes > maxBytes) {
          showToast(`ไม่สามารถบีบอัดรูปภาพให้ต่ำกว่า 500kB ได้ (ขนาดปัจจุบัน ${(finalSizeBytes / 1024).toFixed(1)}kB) กรุณาใช้รูปภาพขนาดเล็กกว่านี้`, 'warning');
        } else {
          setFormImage(dataUrl);
          showToast(`บีบอัดรูปภาพสำเร็จ! ขนาดไฟล์ปลายทาง: ${(finalSizeBytes / 1024).toFixed(1)} kB`, 'success');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('กรุณาเลือกไฟล์เอกสาร PDF เท่านั้น', 'error');
      return;
    }

    const maxBytes = 500 * 1024;
    if (file.size > maxBytes) {
      showToast(`ขนาดไฟล์ PDF (${(file.size / 1024).toFixed(1)} kB) เกินกำหนด 500kB! กรุณาย่อขนาดไฟล์ผ่านบริการฟรีก่อนแนบ เช่น ilovepdf.com หรือ smallpdf.com`, 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      setFormPdf(event.target.result);
      setFormPdfName(file.name);
      showToast(`แนบไฟล์เอกสาร PDF "${file.name}" สำเร็จแล้ว`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);

  // Cascading lists in Form resolved dynamically from localStorage
  const standardItems = useMemo(() => {
    let activePrices = standardPrices;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('da_standard_prices');
      if (saved) {
        try {
          activePrices = JSON.parse(saved);
        } catch (e) { }
      }
    }
    if (formCategory && activePrices[formCategory]) {
      return activePrices[formCategory].items;
    }
    return [];
  }, [formCategory]);

  const formSubgroupsList = useMemo(() => {
    if (formDivision) {
      const matchedDiv = divisions.find(d => d.id === formDivision);
      return matchedDiv ? matchedDiv.subgroups : [];
    }
    return [];
  }, [formDivision, divisions]);

  // If category changed, reset standard item selection
  useEffect(() => {
    setFormStdItem('custom');
  }, [formCategory]);

  // If division changed, reset subgroup selection
  useEffect(() => {
    setFormSubgroup('');
  }, [formDivision]);

  // When standard item changed, auto fill price if not custom
  const handleStandardItemChange = (itemId) => {
    setFormStdItem(itemId);
    if (itemId !== 'custom' && formCategory) {
      const match = standardItems.find(i => i.id === itemId);
      if (match) {
        setFormPrice(match.standardPrice);
      }
    }
  };

  // Price helper evaluator
  const priceHelper = useMemo(() => {
    if (!formPrice || !formCategory) return null;
    const priceNum = Number(formPrice);
    const result = checkPriceCompliance(formCategory, formStdItem, priceNum);

    if (result.status === 'compliant') {
      return {
        color: 'var(--color-success)',
        text: `🟢 ตรงตามราคามาตรฐานงบประมาณ (ไม่เกิน ${result.standardPrice.toLocaleString()} บาท)`
      };
    } else if (result.status === 'over') {
      return {
        color: 'var(--color-error)',
        text: `🔴 สูงกว่าราคามาตรฐาน ${result.difference.toLocaleString()} บาท (เกณฑ์ระบุ ${result.standardPrice.toLocaleString()} บาท)`
      };
    } else {
      return {
        color: 'var(--color-warning)',
        text: `🟡 ครุภัณฑ์นอกเกณฑ์ราคามาตรฐานสำนักงบประมาณ`
      };
    }
  }, [formPrice, formCategory, formStdItem]);

  // Compute filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // 1. Search Query Match
      const searchLower = filterSearch.toLowerCase().trim();
      const matchSearch = !searchLower ||
        a.name.toLowerCase().includes(searchLower) ||
        a.assetCode.toLowerCase().includes(searchLower) ||
        a.owner.toLowerCase().includes(searchLower);

      // 2. Category Match
      const matchCategory = filterCategory === 'all' || a.category === filterCategory;

      // 3. Division Match
      const matchDivision = filterDivision === 'all' || a.divisionId === filterDivision;

      // 4. Compliance Match
      const comp = checkPriceCompliance(a.category, a.standardItemId, a.unitPrice);
      const matchCompliance = filterCompliance === 'all' || comp.status === filterCompliance;

      return matchSearch && matchCategory && matchDivision && matchCompliance;
    });
  }, [assets, filterSearch, filterCategory, filterDivision, filterCompliance]);

  const exportPreviewCount = useMemo(() => {
    return assets.filter(a => {
      if (!a.receivedDate) return false;
      const normalizedDate = getNormalizedChristianDate(a.receivedDate);
      if (exportPeriodType === 'monthly') {
        const prefix = `${exportYear}-${exportMonth}`;
        return normalizedDate.startsWith(prefix);
      } else if (exportPeriodType === 'yearly') {
        const prefix = `${exportYear}`;
        return normalizedDate.startsWith(prefix);
      } else if (exportPeriodType === 'custom') {
        return normalizedDate >= exportStartDate && normalizedDate <= exportEndDate;
      }
      return true;
    }).length;
  }, [assets, exportPeriodType, exportMonth, exportYear, exportStartDate, exportEndDate]);

  // Reset all filters
  const handleResetFilters = () => {
    setFilterSearch('');
    setFilterCategory('all');
    setFilterDivision('all');
    setFilterCompliance('all');
    showToast("ล้างการกรองข้อมูลทั้งหมดแล้ว", "info");
  };

  // Form controls
  const handleOpenNewModal = () => {
    if (currentUser.role === 'viewer') {
      showToast("บัญชีผู้เข้าชม (viewer) ไม่มีสิทธิ์ลงทะเบียนครุภัณฑ์", "error");
      return;
    }
    // Set defaults
    setModalAssetId(null);
    setFormName('');
    setFormCode('');
    setFormCategory('');
    setFormStdItem('custom');
    setFormPrice('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDivision(currentUser.role === 'admin' ? currentUser.divisionId : '');
    setFormSubgroup('');
    setFormOwner('');
    setFormStatus('not_due');
    setFormNotes('');
    setFormImage('');
    setFormLocation('');
    setFormPdf('');
    setFormPdfName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset) => {
    if (currentUser.role === 'viewer') {
      showToast("บัญชีผู้เข้าชม (viewer) ไม่มีสิทธิ์แก้ไขครุภัณฑ์", "error");
      return;
    }
    // Populate form fields
    setModalAssetId(asset.id);
    setFormName(asset.name);
    setFormCode(asset.assetCode);
    setFormCategory(asset.category);
    setFormStdItem(asset.standardItemId || 'custom');
    setFormPrice(asset.unitPrice);
    setFormDate(asset.receivedDate);
    setFormDivision(asset.divisionId);
    setFormSubgroup(asset.subgroupId);
    setFormOwner(asset.owner);
    setFormStatus(asset.status);
    setFormNotes(asset.notes || '');
    setFormImage(asset.image || '');
    setFormLocation(asset.location || '');
    setFormPdf(asset.pdfFile || '');
    setFormPdfName(asset.pdfFileName || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (currentUser.role === 'viewer') {
      showToast("คุณไม่มีสิทธิ์ในการบันทึกข้อมูลครุภัณฑ์", "error");
      return;
    }

    if (!formName || !formCode || !formCategory || !formPrice || !formDate || !formDivision || !formSubgroup || !formOwner || !formStatus) {
      showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (*)", "warning");
      return;
    }

    // Role restriction check for Admins
    if (currentUser.role === 'admin' && formDivision !== currentUser.divisionId) {
      showToast("คุณไม่มีสิทธิ์ระบุฝ่ายงานเป็นฝ่ายอื่นนอกจากฝ่ายตนเอง", "error");
      return;
    }

    const assetData = {
      id: modalAssetId || `asset_${Date.now()}`,
      name: formName.trim(),
      assetCode: formCode.trim(),
      category: formCategory,
      standardItemId: formStdItem,
      unitPrice: Number(formPrice),
      receivedDate: formDate,
      divisionId: formDivision,
      subgroupId: formSubgroup,
      owner: formOwner.trim(),
      status: formStatus,
      notes: formNotes.trim(),
      image: formImage,
      location: formLocation.trim(),
      pdfFile: formPdf,
      pdfFileName: formPdfName
    };

    onSaveAsset(assetData);
    setIsModalOpen(false);
  };

  // Delete Actions
  const handleRequestDelete = (id) => {
    if (currentUser.role === 'viewer') {
      showToast("บัญชีผู้เข้าชม (viewer) ไม่มีสิทธิ์ลบครุภัณฑ์", "error");
      return;
    }
    setConfirmTargetId(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (confirmTargetId) {
      onDeleteAsset(confirmTargetId);
    }
    setIsConfirmOpen(false);
    setConfirmTargetId(null);
  };

  // Export Styled Excel (.xls HTML formatting)
  const handleExportExcel = () => {
    setIsExportModalOpen(true);
  };

  const handleExportExcelData = () => {
    // 1. Filter entire assets database by selected period
    const exportAssets = assets.filter(a => {
      if (!a.receivedDate) return false;
      const normalizedDate = getNormalizedChristianDate(a.receivedDate);
      if (exportPeriodType === 'monthly') {
        const prefix = `${exportYear}-${exportMonth}`;
        return normalizedDate.startsWith(prefix);
      } else if (exportPeriodType === 'yearly') {
        const prefix = `${exportYear}`;
        return normalizedDate.startsWith(prefix);
      } else if (exportPeriodType === 'custom') {
        return normalizedDate >= exportStartDate && normalizedDate <= exportEndDate;
      }
      return true;
    });

    if (exportAssets.length === 0) {
      showToast("ไม่พบข้อมูลครุภัณฑ์ในช่วงเวลาที่ระบุ", "warning");
      return;
    }

    // Generate Thai month labels
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthLabel = thaiMonths[parseInt(exportMonth, 10) - 1] || '';

    // Generate subtitle based on range
    let periodText = '';
    if (exportPeriodType === 'monthly') {
      periodText = `ประจำเดือน ${monthLabel} พ.ศ. ${parseInt(exportYear, 10) + 543}`;
    } else if (exportPeriodType === 'yearly') {
      periodText = `ประจำปีงบประมาณ พ.ศ. ${parseInt(exportYear, 10) + 543}`;
    } else if (exportPeriodType === 'custom') {
      const formatDateThai = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        const thM = thaiMonths[parseInt(m, 10) - 1] || '';
        return `${parseInt(d, 10)} ${thM} พ.ศ. ${parseInt(y, 10) + 543}`;
      };
      periodText = `ระหว่างวันที่ ${formatDateThai(exportStartDate)} ถึง วันที่ ${formatDateThai(exportEndDate)}`;
    }

    let htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; }
    table { border-collapse: collapse; }
    th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: center; border: 0.5pt solid #cbd5e1; padding: 10px; font-size: 11pt; }
    td { border: 0.5pt solid #cbd5e1; padding: 8px; font-size: 10pt; vertical-align: middle; }
    .title { font-size: 16pt; font-weight: bold; text-align: center; padding: 15px; color: #1e3a8a; border: none; }
    .subtitle { font-size: 10pt; text-align: center; color: #64748b; padding-bottom: 15px; border: none; }
    .compliant { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
    .over { background-color: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
    .custom { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
    .number { text-align: right; mso-number-format: "\\#,\\#\\#0"; }
    .center { text-align: center; }
    .code { font-family: monospace; text-align: center; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="13" class="title" style="text-align: center;">รายงานทะเบียนครุภัณฑ์และตรวจสอบเกณฑ์ราคามาตรฐาน</td>
    </tr>
    <tr>
      <td colspan="13" class="subtitle" style="text-align: center; padding-bottom: 15px;"> | ${periodText} | ข้อมูล ณ วันที่ ${new Date().toLocaleDateString('th-TH')}</td>
    </tr>
    <tr>
      <th>รูปภาพ</th>
      <th>เลขครุภัณฑ์</th>
      <th>ชื่อรายการครุภัณฑ์</th>
      <th>หมวดหมู่ครุภัณฑ์</th>
      <th>ฝ่ายที่รับผิดชอบ</th>
      <th>กลุ่มงานย่อย</th>
      <th>สถานที่ตั้ง</th>
      <th>ราคาจัดซื้อจริง (บาท)</th>
      <th>ราคามาตรฐาน (บาท)</th>
      <th>สถานะประเมินราคา</th>
      <th>สถานะการใช้งาน</th>
      <th>ผู้ดูแล</th>
      <th>เอกสารแนบ (PDF)</th>
    </tr>
    `;

    exportAssets.forEach(a => {
      const div = divisions.find(d => d.id === a.divisionId);
      const sub = div ? div.subgroups.find(s => s.id === a.subgroupId) : null;
      const comp = checkPriceCompliance(a.category, a.standardItemId, a.unitPrice);

      const categoryLabel = getCategoryLabel(a.category);
      const divisionName = div ? div.name : 'ไม่พบฝ่าย';
      const subgroupName = sub ? sub.name : 'ไม่พบกลุ่มงาน';

      let compClass = 'custom';
      let compStatus = 'นอกเกณฑ์';
      if (comp.status === 'compliant') {
        compClass = 'compliant';
        compStatus = 'ตรงมาตรฐาน';
      } else if (comp.status === 'over') {
        compClass = 'over';
        compStatus = 'เกินมาตรฐาน';
      }

      let usageStatus = 'ยังไม่ระบุ';
      if (a.status === 'not_due') usageStatus = 'ยังไม่ถึงห้วงเวลาจัดซื้อ';
      else if (a.status === 'due_not_started') usageStatus = 'ถึงกำหนดแต่ยังไม่เริ่ม';
      else if (a.status === 'pending_approval') usageStatus = 'ขออนุมัติจัดซื้อ/จ้าง';
      else if (a.status === 'tor_price') usageStatus = 'กำหนด TOR/ราคากลาง';
      else if (a.status === 'procurement') usageStatus = 'กระบวนการจัดซื้อจัดจ้าง';
      else if (a.status === 'inspection') usageStatus = 'ตรวจรับพัสดุ';
      else if (a.status === 'completed') usageStatus = 'ดำเนินการเสร็จสิ้น';
      else if (a.status === 'cancelled') usageStatus = 'ยกเลิกจัดซื้อ';

      let imgTag = '<td class="center" style="color: #94a3b8; font-size: 9pt; text-align: center; vertical-align: middle;">-</td>';
      if (a.image) {
        imgTag = `<td class="center" style="width: 80px; height: 80px; text-align: center; vertical-align: middle;">
          <img src="${a.image}" width="60" height="60" style="border: 0.5pt solid #cbd5e1; border-radius: 4px; object-fit: cover;" />
        </td>`;
      }

      htmlContent += `
    <tr>
      ${imgTag}
      <td class="code">${a.assetCode}</td>
      <td style="font-weight: 500;">${a.name}</td>
      <td>${categoryLabel}</td>
      <td>${divisionName}</td>
      <td>${subgroupName}</td>
      <td>${a.location || '-'}</td>
      <td class="number">${a.unitPrice}</td>
      <td class="number">${comp.standardPrice || 0}</td>
      <td class="${compClass}">${compStatus}</td>
      <td class="center">${usageStatus}</td>
      <td>${a.owner}</td>
      <td>${a.pdfFileName ? 'มีไฟล์ PDF (' + a.pdfFileName + ')' : '-'}</td>
    </tr>
      `;
    });


    htmlContent += `
  </table>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Durable_Articles_Report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
    showToast("ส่งออกรายงานราชการรูปแบบ Excel สำเร็จแล้ว", "success");
  };


  // Status mapping UI helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case 'not_due': return <span className="badge badge-info">⏳ ยังไม่ถึงห้วงเวลา</span>;
      case 'due_not_started': return <span className="badge badge-warning">📌 ถึงกำหนดแต่ยังไม่เริ่ม</span>;
      case 'pending_approval': return <span className="badge badge-info">📝 ขออนุมัติ</span>;
      case 'tor_price': return <span className="badge badge-info">🔍 กำหนด TOR</span>;
      case 'procurement': return <span className="badge badge-warning">⚙️ จัดซื้อจัดจ้าง</span>;
      case 'inspection': return <span className="badge badge-warning">📦 ตรวจรับพัสดุ</span>;
      case 'completed': return <span className="badge badge-success">✅ เสร็จสิ้น</span>;
      default: return <span className="badge badge-error">❌ ยกเลิก</span>;
    }
  };

  const getComplianceBadge = (category, stdItemId, price) => {
    const res = checkPriceCompliance(category, stdItemId, price);
    if (res.status === 'compliant') return <span className="badge badge-success">🟢 ตรงมาตรฐาน</span>;
    if (res.status === 'over') return <span className="badge badge-error">🔴 เกินมาตรฐาน</span>;
    return <span className="badge badge-warning">🟡 นอกเกณฑ์</span>;
  };

  return (
    <section id="view-assets" className="view-container active">
      {/* Search and Filters Controller Card */}
      <div className="controls-card">
        <div className="filters-grid">
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="filter-search">ค้นหาครุภัณฑ์</label>
            <input
              type="text"
              id="filter-search"
              className="form-control"
              placeholder="พิมพ์เลขครุภัณฑ์, ชื่อ หรือผู้ดูแล..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="filter-category">หมวดครุภัณฑ์</label>
            <select
              id="filter-category"
              className="form-control"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">-- ทั้งหมด --</option>
              <option value="computer">ครุภัณฑ์คอมพิวเตอร์</option>
              <option value="office">ครุภัณฑ์สำนักงาน</option>
              <option value="vehicle">ครุภัณฑ์ยานพาหนะและขนส่ง</option>
              <option value="science">ครุภัณฑ์วิทยาศาสตร์การแพทย์</option>
              <option value="construction">ครุภัณฑ์ก่อสร้าง</option>
              <option value="agriculture">ครุภัณฑ์การเกษตร</option>
              <option value="other">ครุภัณฑ์อื่นๆ</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="filter-division">ฝ่ายงานที่รับผิดชอบ</label>
            <select
              id="filter-division"
              className="form-control"
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
            >
              <option value="all">-- ทั้งหมด --</option>
              {divisions.map(div => (
                <option key={div.id} value={div.id}>{div.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="filter-compliance">สถานะราคามาตรฐาน</label>
            <select
              id="filter-compliance"
              className="form-control"
              value={filterCompliance}
              onChange={(e) => setFilterCompliance(e.target.value)}
            >
              <option value="all">-- ทั้งหมด --</option>
              <option value="compliant">🟢 ตรงตามเกณฑ์</option>
              <option value="over">🔴 สูงกว่ามาตรฐาน</option>
              <option value="custom">🟡 นอกเกณฑ์มาตรฐาน</option>
            </select>
          </div>

          <div className="action-btns" style={{ marginBottom: '2px' }}>
            <button id="reset-filter-btn" className="btn-secondary" title="ล้างตัวกรอง" onClick={handleResetFilters}>ล้าง</button>
            <button id="export-csv-btn" className="btn-secondary" title="ส่งออก Excel (รายงานแบบทางการ)" onClick={handleExportExcel}>
              <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" /></svg>
              ส่งออก Excel
            </button>
            <button id="print-report-btn" className="btn-secondary" title="พิมพ์รายงาน" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
              พิมพ์
            </button>
          </div>
        </div>
      </div>

      {/* Floating dynamic 'Add New' Action Button */}
      {currentUser.role !== 'viewer' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <button id="add-asset-btn" className="btn-primary" onClick={handleOpenNewModal}>
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            ลงทะเบียนครุภัณฑ์ใหม่
          </button>
        </div>
      )}

      {/* Table Card Section */}
      <div className="table-card">
        <div className="table-wrapper">
          <table className="premium-table" id="assets-table">
            <thead>
              <tr>
                <th>เลขครุภัณฑ์</th>
                <th>ชื่อรายการครุภัณฑ์</th>
                <th className="hide-tablet">หมวดครุภัณฑ์</th>
                <th className="hide-mobile">ฝ่าย / กลุ่มงานหลัก</th>
                <th>ราคา (บาท)</th>
                <th className="hide-tablet">ราคามาตรฐานสูงสุด</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody id="assets-table-body">
              {filteredAssets.map(asset => {
                const div = divisions.find(d => d.id === asset.divisionId);
                const sub = div ? div.subgroups.find(s => s.id === asset.subgroupId) : null;
                const comp = checkPriceCompliance(asset.category, asset.standardItemId, asset.unitPrice);

                return (
                  <tr key={asset.id}>
                    <td><span className="asset-code">{asset.assetCode}</span></td>
                    <td style={{ fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {asset.image && (
                            <img
                              src={asset.image}
                              alt={asset.name}
                              onClick={() => setPreviewAsset(asset)}
                              title="คลิกเพื่อดูรูปภาพและรายละเอียดครุภัณฑ์"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: 'var(--radius-sm)',
                                objectFit: 'cover',
                                border: '1px solid var(--border-color)',
                                flexShrink: 0,
                                cursor: 'pointer'
                              }}
                            />
                          )}
                          <span>{asset.name}</span>
                        </div>
                        {asset.pdfFile && (
                          <a
                            href={asset.pdfFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`เปิดไฟล์เอกสารแนบ: ${asset.pdfFileName || 'PDF'}`}
                            style={{
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.74rem',
                              fontWeight: '600',
                              background: 'var(--color-info-bg)',
                              color: 'var(--color-info)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.15rem',
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            📄 PDF
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="hide-tablet">{getCategoryLabel(asset.category)}</td>
                    <td className="hide-mobile">
                      <div>
                        <strong>{div ? div.name : 'ไม่พบฝ่าย'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub ? sub.name : 'ไม่พบกลุ่มงาน'}</div>
                        {asset.location && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            📍 {asset.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'Inter', fontWeight: '600' }}>{asset.unitPrice.toLocaleString()}</td>
                    <td className="hide-tablet" style={{ fontFamily: 'Inter', color: 'var(--text-secondary)' }}>
                      {comp.standardPrice ? comp.standardPrice.toLocaleString() : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                        {getStatusBadge(asset.status)}
                        {getComplianceBadge(asset.category, asset.standardItemId, asset.unitPrice)}
                      </div>
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        {currentUser.role !== 'viewer' && (
                          <>
                            <button
                              className="btn-icon edit"
                              title="แก้ไขรายการ"
                              onClick={() => handleOpenEditModal(asset)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                            </button>
                            <button
                              className="btn-icon delete"
                              title="ลบรายการ"
                              onClick={() => handleRequestDelete(asset.id)}
                            >
                              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                            </button>
                          </>
                        )}
                        {currentUser.role === 'viewer' && '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <div id="assets-empty-state" className="empty-state">
            <svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H6v-2h8v2zm4-4H6v-2h12v2z" /></svg>
            <h3>ไม่พบข้อมูลครุภัณฑ์</h3>
            <p>ไม่มีรายการพัสดุใดสอดคล้องกับการค้นหาหรือเงื่อนไขตัวกรองของคุณ</p>
          </div>
        )}
      </div>

      {/* FORM MODAL OVERLAY */}
      {isModalOpen && (
        <div className="modal-overlay active" id="asset-modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="asset-modal-title">{modalAssetId ? "แก้ไขรายการครุภัณฑ์" : "ลงทะเบียนครุภัณฑ์ใหม่"}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="asset-form" className="modal-form" onSubmit={handleSaveSubmit}>

                <div className="input-group span-2">
                  <label htmlFor="form-asset-name">ชื่อรายการครุภัณฑ์ *</label>
                  <input
                    type="text"
                    id="form-asset-name"
                    className="form-control"
                    placeholder="ระบุชื่อเรียกครุภัณฑ์ เช่น คอมพิวเตอร์งานบัญชี..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-code">เลขครุภัณฑ์ *</label>
                  <input
                    type="text"
                    id="form-asset-code"
                    className="form-control"
                    placeholder="คร.10.คอม.68/xxx"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-category">หมวดหมู่ตามงบประมาณ *</label>
                  <select
                    id="form-asset-category"
                    className="form-control"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    <option value="computer">ครุภัณฑ์คอมพิวเตอร์</option>
                    <option value="office">ครุภัณฑ์สำนักงาน</option>
                    <option value="vehicle">ครุภัณฑ์ยานพาหนะและขนส่ง</option>
                    <option value="science">ครุภัณฑ์วิทยาศาสตร์การแพทย์</option>
                    <option value="construction">ครุภัณฑ์ก่อสร้าง</option>
                    <option value="agriculture">ครุภัณฑ์การเกษตร</option>
                    <option value="other">ครุภัณฑ์อื่นๆ</option>
                  </select>
                </div>

                <div className="input-group span-2">
                  <label htmlFor="form-asset-std-item">ผูกรายการราคามาตรฐาน (ธ.ค. 2568 / พ.ค. 2569)</label>
                  <select
                    id="form-asset-std-item"
                    className="form-control"
                    disabled={!formCategory}
                    value={formStdItem}
                    onChange={(e) => handleStandardItemChange(e.target.value)}
                  >
                    <option value="custom">ระบุรายละเอียดเอง / นอกเหนือจากเกณฑ์มาตรฐาน</option>
                    {standardItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {`${item.name} (${item.standardPrice.toLocaleString()} บาท)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-price">ราคาต่อหน่วย (บาท) *</label>
                  <input
                    type="number"
                    id="form-asset-price"
                    className="form-control"
                    placeholder="ระบุราคาจัดซื้อจริงต่อหน่วย..."
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                  {priceHelper && (
                    <div
                      id="form-price-helper"
                      className="field-price-helper"
                      style={{ display: 'flex', color: priceHelper.color, marginTop: '0.25rem', fontSize: '0.8rem' }}
                    >
                      {priceHelper.text}
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-date">วันที่ได้รับ / ลงทะเบียน *</label>
                  <input
                    type="date"
                    id="form-asset-date"
                    className="form-control"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-division">ฝ่ายงานที่ครอบครอง *</label>
                  <select
                    id="form-asset-division"
                    className="form-control"
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    disabled={currentUser.role === 'admin'} // Admin is locked to their own division
                    required
                  >
                    <option value="">-- เลือกฝ่าย --</option>
                    {divisions.map(div => (
                      <option key={div.id} value={div.id}>{div.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-subgroup">กลุ่มงานหลัก/ย่อย *</label>
                  <select
                    id="form-asset-subgroup"
                    className="form-control"
                    value={formSubgroup}
                    onChange={(e) => setFormSubgroup(e.target.value)}
                    disabled={!formDivision}
                    required
                  >
                    <option value="">-- {formDivision ? "เลือกกลุ่มงานย่อย" : "กรุณาเลือกฝ่ายงานก่อน"} --</option>
                    {formSubgroupsList.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-owner">ผู้ดูแล / ผู้รับผิดชอบ *</label>
                  <input
                    type="text"
                    id="form-asset-owner"
                    className="form-control"
                    placeholder="ระบุชื่อเจ้าหน้าที่..."
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="form-asset-status">สถานะพัสดุ *</label>
                  <select
                    id="form-asset-status"
                    className="form-control"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    required
                  >
                    <option value="not_due">⏳ ยังไม่ถึงห้วงเวลาจัดซื้อ</option>
                    <option value="due_not_started">📌 ถึงกำหนดแต่ยังไม่เริ่ม</option>
                    <option value="pending_approval">📝 ขออนุมัติจัดซื้อ/จ้าง</option>
                    <option value="tor_price">🔍 กำหนด TOR/ราคากลาง</option>
                    <option value="procurement">⚙️ กระบวนการจัดซื้อจัดจ้าง</option>
                    <option value="inspection">📦 ตรวจรับพัสดุ</option>
                    <option value="completed">✅ ดำเนินการเสร็จสิ้น</option>
                    <option value="cancelled">❌ ยกเลิกจัดซื้อ</option>
                  </select>
                </div>

                <div className="input-group span-2">
                  <label htmlFor="form-asset-location">สถานที่ตั้ง / ห้องติดตั้งพัสดุ</label>
                  <input
                    type="text"
                    id="form-asset-location"
                    className="form-control"
                    placeholder="ระบุสถานที่ตั้ง เช่น อาคาร 3 ชั้น 2 ห้องประชุมสารบรรณ..."
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>

                <div className="input-group span-2">
                  <label htmlFor="form-asset-notes">บันทึกเพิ่มเติม (รายละเอียดสเปก หรือคำอธิบายเสริม)</label>
                  <textarea
                    id="form-asset-notes"
                    className="form-control"
                    rows="3"
                    placeholder="ระบุข้อมูลเสริม เช่น ยี่ห้อ รุ่น หรือหมายเหตุอื่นๆ..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  ></textarea>
                </div>

                <div className="input-group span-2" style={{ marginTop: '0.5rem' }}>
                  <label>แนบรูปภาพครุภัณฑ์ (บีบอัดอัตโนมัติไม่เกิน 500kB)</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap'
                  }}>
                    {formImage ? (
                      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                        <img
                          src={formImage}
                          alt="Asset preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormImage('')}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}
                          title="ลบรูปภาพ"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px dashed var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        gap: '0.25rem'
                      }}>
                        <span>📷</span>
                        <span>ไม่มีรูปภาพ</span>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="file"
                        id="form-asset-image-file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => document.getElementById('form-asset-image-file').click()}
                        style={{ width: 'fit-content', fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        📤 เลือกไฟล์รูปภาพ
                      </button>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        รองรับไฟล์รูปภาพทุกประเภท ระบบจะทำการย่อและบีบอัดขนาดไฟล์ให้มีขนาดเล็กต่ำกว่า 500kB โดยอัตโนมัติ เพื่อการจัดเก็บที่รวดเร็ว
                      </span>
                    </div>
                  </div>
                </div>

                <div className="input-group span-2" style={{ marginTop: '0.75rem' }}>
                  <label>แนบเอกสารราชการ (สัญญาจัดซื้อ/สเปก/ใบเสนอราคา PDF - ไม่เกิน 500kB)</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap'
                  }}>
                    {formPdf ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '0.6rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📄</span>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            color: 'var(--color-info)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }} title={formPdfName}>
                            {formPdfName}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เอกสารแนบ PDF พร้อมใช้งาน</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormPdf('');
                            setFormPdfName('');
                          }}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginLeft: '0.5rem',
                            flexShrink: 0
                          }}
                          title="ลบไฟล์เอกสาร"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: '100px',
                        height: '60px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px dashed var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        gap: '0.25rem',
                        flexShrink: 0
                      }}>
                        <span>📄</span>
                        <span>ไม่มีเอกสารแนบ</span>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <input
                        type="file"
                        id="form-asset-pdf-file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={handlePdfChange}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => document.getElementById('form-asset-pdf-file').click()}
                        style={{ width: 'fit-content', fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'inherit' }}
                      >
                        📤 เลือกไฟล์ PDF
                      </button>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        * จำกัดขนาดไม่เกิน 500kB หากไฟล์มีขนาดใหญ่กว่านี้ แนะนำย่อขนาดไฟล์เหนือกราฟิกผ่านเว็บฟรียอดนิยมอย่าง{' '}
                        <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>ilovepdf.com</a> หรือ{' '}
                        <a href="https://smallpdf.com/compress-pdf" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>smallpdf.com</a> ก่อนอัปโหลด
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleCloseModal}>ยกเลิก</button>
              <button type="button" className="btn-primary" onClick={handleSaveSubmit}>บันทึกพัสดุ</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      {isConfirmOpen && (
        <div className="modal-overlay active" id="confirm-modal" style={{ display: 'flex' }}>
          <div className="modal-content confirm-modal-content">
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon warning">
                <svg viewBox="0 0 24 24" className="confirm-icon-svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" />
                </svg>
              </div>
              <h3 id="confirm-modal-title">ยืนยันการลบครุภัณฑ์</h3>
            </div>
            <div className="modal-body confirm-modal-body" style={{ textAlign: 'center' }}>
              <p>คุณแน่ใจหรือไม่ว่าต้องการลบรายการครุภัณฑ์นี้ออกจากฐานข้อมูล? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <div className="modal-footer confirm-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsConfirmOpen(false)}>ยกเลิก</button>
              <button type="button" className="btn-confirm-action" style={{ background: 'var(--color-error)' }} onClick={handleConfirmDelete}>ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL EXPORT PERIOD SELECTION MODAL */}
      {isExportModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>เลือกช่วงเวลาสำหรับส่งออก Excel</h3>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                เลือกช่วงเวลาที่ต้องการดาวน์โหลดข้อมูลทะเบียนครุภัณฑ์ ระบบจะประมวลผลและสร้างไฟล์แบบฟอร์มรายงานที่เป็นทางการ
              </p>

              {/* PERIOD TYPE RADIO BUTTONS / TABS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                background: 'var(--bg-app)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => setExportPeriodType('monthly')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: exportPeriodType === 'monthly' ? 'bold' : 'normal',
                    background: exportPeriodType === 'monthly' ? 'var(--accent-color)' : 'transparent',
                    color: exportPeriodType === 'monthly' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📆 รายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => setExportPeriodType('yearly')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: exportPeriodType === 'yearly' ? 'bold' : 'normal',
                    background: exportPeriodType === 'yearly' ? 'var(--accent-color)' : 'transparent',
                    color: exportPeriodType === 'yearly' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📅 รายปี
                </button>
                <button
                  type="button"
                  onClick={() => setExportPeriodType('custom')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    fontWeight: exportPeriodType === 'custom' ? 'bold' : 'normal',
                    background: exportPeriodType === 'custom' ? 'var(--accent-color)' : 'transparent',
                    color: exportPeriodType === 'custom' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⏱️ เลือกช่วงเวลาเอง
                </button>
              </div>

              {/* MONTHLY SELECTOR */}
              {exportPeriodType === 'monthly' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div className="input-group">
                    <label>เลือกเดือน</label>
                    <select
                      className="form-control"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                    >
                      <option value="01">มกราคม</option>
                      <option value="02">กุมภาพันธ์</option>
                      <option value="03">มีนาคม</option>
                      <option value="04">เมษายน</option>
                      <option value="05">พฤษภาคม</option>
                      <option value="06">มิถุนายน</option>
                      <option value="07">กรกฎาคม</option>
                      <option value="08">สิงหาคม</option>
                      <option value="09">กันยายน</option>
                      <option value="10">ตุลาคม</option>
                      <option value="11">พฤศจิกายน</option>
                      <option value="12">ธันวาคม</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>เลือกปี (ค.ศ.)</label>
                    <select
                      className="form-control"
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                    >
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>ค.ศ. {yr} (พ.ศ. {parseInt(yr, 10) + 543})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* YEARLY SELECTOR */}
              {exportPeriodType === 'yearly' && (
                <div className="input-group" style={{ marginTop: '0.5rem' }}>
                  <label>เลือกปี (ค.ศ.)</label>
                  <select
                    className="form-control"
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>ค.ศ. {yr} (พ.ศ. {parseInt(yr, 10) + 543})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* CUSTOM DATE RANGE */}
              {exportPeriodType === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div className="input-group">
                    <label>ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      className="form-control"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>ถึงวันที่</label>
                    <input
                      type="date"
                      className="form-control"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* EXPORT COUNT PREVIEW */}
              <div style={{
                background: exportPreviewCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${exportPreviewCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.5rem'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>จำนวนรายการครุภัณฑ์ที่จะส่งออก:</span>
                <strong style={{
                  fontSize: '1rem',
                  color: exportPreviewCount > 0 ? 'var(--color-success)' : 'var(--color-error)'
                }}>
                  {exportPreviewCount} รายการ
                </strong>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsExportModalOpen(false)}>ยกเลิก</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExportExcelData}
                disabled={exportPreviewCount === 0}
                style={{
                  opacity: exportPreviewCount === 0 ? 0.5 : 1,
                  cursor: exportPreviewCount === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                📊 ดึงข้อมูลและดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      {previewAsset && (() => {
        const previewDiv = divisions.find(d => d.id === previewAsset.divisionId);
        const previewSub = previewDiv ? previewDiv.subgroups.find(s => s.id === previewAsset.subgroupId) : null;
        const previewDivName = previewDiv ? previewDiv.name : 'ไม่พบฝ่าย';
        const previewSubName = previewSub ? previewSub.name : 'ไม่พบกลุ่มงาน';

        return (
          <div className="modal-overlay active" style={{ display: 'flex', zIndex: 999999 }} onClick={() => setPreviewAsset(null)}>
            <div className="modal-content" style={{
              maxWidth: '850px',
              width: '95%',
              maxHeight: '95vh',
              background: 'var(--bg-surface-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: 'var(--glass-shadow)',
              backdropFilter: 'var(--glass-blur)',
              overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'inherit' }}>🔍 รายละเอียดและรูปภาพครุภัณฑ์</h3>
                <button className="modal-close-btn" style={{ position: 'static' }} onClick={() => setPreviewAsset(null)}>&times;</button>
              </div>
              <div style={{
                width: '100%',
                maxHeight: '48vh',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)'
              }}>
                <img
                  src={previewAsset.image}
                  alt={previewAsset.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '48vh',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>

              {/* Asset Details Grid */}
              <div style={{
                marginTop: '1.25rem',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem 1.25rem',
                background: 'var(--bg-app)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.88rem'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>ชื่อรายการ:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{previewAsset.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>เลขครุภัณฑ์:</span>
                  <strong style={{ color: 'var(--accent-color)', fontFamily: 'monospace' }}>{previewAsset.assetCode}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>หมวดครุภัณฑ์:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{getCategoryLabel(previewAsset.category)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>ราคาจัดซื้อจริง:</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'Inter' }}>{previewAsset.unitPrice.toLocaleString()} บาท</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>ฝ่ายที่ครอบครอง:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{previewDivName}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>กลุ่มงานย่อย:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{previewSubName}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>สถานที่ตั้ง:</span>
                  <span style={{ color: 'var(--text-primary)' }}>📍 {previewAsset.location || '-'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>ผู้ดูแล:</span>
                  <span style={{ color: 'var(--text-primary)' }}>👤 {previewAsset.owner}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>เอกสารแนบ (PDF):</span>
                  {previewAsset.pdfFile ? (
                    <a
                      href={previewAsset.pdfFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--color-info)',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      📄 เปิดดูเอกสารคู่มือ/ใบเสนอราคา ({previewAsset.pdfFileName || 'ดาวน์โหลด PDF'})
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>ไม่มีเอกสารแนบ</span>
                  )}
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>หมายเหตุ:</span>
                  <span style={{ color: 'var(--text-primary)', fontStyle: previewAsset.notes ? 'normal' : 'italic' }}>{previewAsset.notes || 'ไม่มีบันทึกเพิ่มเติม'}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button type="button" className="btn-secondary" style={{ width: '120px', padding: '0.5rem 1rem', fontFamily: 'inherit' }} onClick={() => setPreviewAsset(null)}>ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

