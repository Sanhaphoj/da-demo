'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import AuthScreen from '../components/AuthScreen';
import DashboardView from '../components/DashboardView';
import AssetsView from '../components/AssetsView';
import OrgView from '../components/OrgView';
import VerifierView from '../components/VerifierView';
import UsersView from '../components/UsersView';
import DatabaseView from '../components/DatabaseView';
import TrashView from '../components/TrashView';
import FIREBASE_CONFIG from '../../config.js';

const initialAssets = [];
const initialDivisions = [
  {
    id: "admin",
    name: "ฝ่ายบริหารทั่วไป",
    subgroups: [
      { id: "admin-saraban", name: "งานสารบรรณและธุรการ" },
      { id: "admin-finance", name: "งานการเงินและบัญชี" },
      { id: "admin-procure", name: "งานพัสดุและอาคารสถานที่" },
      { id: "admin-pr", name: "งานประชาสัมพันธ์" }
    ]
  },
  {
    id: "asset",
    name: "ฝ่ายจัดการครุภัณฑ์และสินทรัพย์",
    subgroups: [
      { id: "asset-register", name: "งานทะเบียนและประเมินราคาทรัพย์สิน" },
      { id: "asset-audit", name: "งานตรวจสอบและจำหน่ายครุภัณฑ์ประจำปี" },
      { id: "asset-maintenance", name: "งานบำรุงรักษาและซ่อมแซม" }
    ]
  },
  {
    id: "strategy",
    name: "ฝ่ายยุทธศาสตร์และแผนงาน",
    subgroups: [
      { id: "strategy-plan", name: "งานแผนงานและงบประมาณประจำปี" },
      { id: "strategy-tech", name: "งานเทคโนโลยีสารสนเทศและฐานข้อมูล" },
      { id: "strategy-evaluation", name: "งานติดตามและประเมินผลโครงการ" }
    ]
  },
  {
    id: "technical",
    name: "ฝ่ายวิชาการและการประเมินผล",
    subgroups: [
      { id: "technical-research", name: "งานวิเคราะห์วิจัยและพัฒนา" },
      { id: "technical-standards", name: "งานกำหนดมาตรฐานและควบคุมคุณภาพ" },
      { id: "technical-km", name: "งานจัดการความรู้และฝึกอบรม" }
    ]
  }
];
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { showToast } from '../lib/toast';

export default function RootPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState('light'); // 'dark' | 'light' (Light as default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // App Dynamic State
  const [assets, setAssets] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [users, setUsers] = useState([]);
  const [trashAssets, setTrashAssets] = useState([]);

  // Firebase State References
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [dbStatusDesc, setDbStatusDesc] = useState('จัดเก็บข้อมูลในเว็บเบราว์เซอร์');
  const firestoreDbRef = useRef(null);
  const firebaseUnsubscribeRef = useRef(null);

  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const isOffline = localStorage.getItem('da_database_offline') === 'true';
      if (isOffline) {
        return null;
      }

      const saved = localStorage.getItem('da_firebase_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse custom Firebase config:", e);
        }
      }
    }
    return FIREBASE_CONFIG;
  });

  // 1. Theme initialization and handler
  useEffect(() => {
    const savedTheme = localStorage.getItem('da_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('da_theme', nextTheme);
    showToast(`เปลี่ยนธีมเป็น ${nextTheme === 'light' ? 'โหมดสว่าง' : 'โหมดมืด'} เรียบร้อยแล้ว`, 'info');
  };

  // 2. Load Local Data cache
  useEffect(() => {
    // Divisions
    const localDivisions = localStorage.getItem('da_divisions');
    if (localDivisions) {
      setDivisions(JSON.parse(localDivisions));
    } else {
      setDivisions(initialDivisions);
      localStorage.setItem('da_divisions', JSON.stringify(initialDivisions));
    }

    // Assets
    const localAssets = localStorage.getItem('da_assets');
    if (localAssets) {
      setAssets(JSON.parse(localAssets));
    } else {
      setAssets(initialAssets);
      localStorage.setItem('da_assets', JSON.stringify(initialAssets));
    }

    // Trash Bin
    const localTrash = localStorage.getItem('da_trash');
    let loadedTrash = localTrash ? JSON.parse(localTrash) : [];
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const initialCount = loadedTrash.length;
    loadedTrash = loadedTrash.filter(a => a.deletedAt && new Date(a.deletedAt) >= tenDaysAgo);
    if (loadedTrash.length !== initialCount) {
      localStorage.setItem('da_trash', JSON.stringify(loadedTrash));
    }
    setTrashAssets(loadedTrash);

    // Users (Seeds default certified accounts if no users exist in local storage)
    const localUsers = localStorage.getItem('da_users');
    let loadedUsers = [];
    if (localUsers) {
      try {
        loadedUsers = JSON.parse(localUsers);
        // PROACTIVE MIGRATION FIX: If browser has old cached seeded accounts with lowercase hashes, auto-upgrade them!
        let migrated = false;
        loadedUsers = loadedUsers.map(u => {
          if (u.email && (u.email === "superadmin@sasuk.go.th" || u.email === "admin@sasuk.go.th" || u.email === "viewer@sasuk.go.th")) {
            if (u.password === "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8") {
              u.password = "a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea";
              migrated = true;
            }
          }
          return u;
        });
        if (migrated) {
          localStorage.setItem('da_users', JSON.stringify(loadedUsers));
        }
      } catch (e) {
        loadedUsers = [];
      }
    }

    if (loadedUsers.length === 0) {
      loadedUsers = [
        {
          name: "ผู้ดูแลระบบระดับสูง (Super Admin)",
          divisionId: "admin",
          email: "superadmin@sasuk.go.th",
          password: "a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea", // "Password123!" (BUG FIX: Corrected Hash)
          role: "super admin"
        },
        {
          name: "ผู้จัดการครุภัณฑ์ทั่วไป (Admin)",
          divisionId: "admin",
          email: "admin@sasuk.go.th",
          password: "a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea", // "Password123!" (BUG FIX: Corrected Hash)
          role: "admin"
        },
        {
          name: "ผู้เข้าชมข้อมูลพัสดุ (Viewer)",
          divisionId: "asset",
          email: "viewer@sasuk.go.th",
          password: "a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea", // "Password123!" (BUG FIX: Corrected Hash)
          role: "viewer"
        }
      ];
      localStorage.setItem('da_users', JSON.stringify(loadedUsers));
    }
    setUsers(loadedUsers);

    // 3. Load Session from cache
    const savedSession = localStorage.getItem('da_current_user') || sessionStorage.getItem('da_current_user');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      setCurrentUser(parsed);
    }
  }, []);

  // 4. Firebase Sync Setup (Runs only when user is logged in)
  useEffect(() => {
    if (!currentUser) {
      // Clear Firestore subscriptions on logout
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
      setIsFirebaseConnected(false);
      setDbStatusDesc('จัดเก็บข้อมูลในเว็บเบราว์เซอร์');
      return;
    }

    let isSubscribed = true;

    async function setupFirebase() {
      // Only proceed if API credentials are valid and defined
      if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        if (isSubscribed) {
          setIsFirebaseConnected(false);
          setDbStatusDesc('จัดเก็บข้อมูลในเว็บเบราว์เซอร์');
        }
        return;
      }

      try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(app);

        if (!isSubscribed) return;

        // Perform real connection check by fetching a single document from cloud
        const docRef = doc(db, "durable_articles_sys", "office_state");
        await getDoc(docRef);

        firestoreDbRef.current = db;
        setIsFirebaseConnected(true);
        setDbStatusDesc('เชื่อมต่อ Firestore เรียบร้อย');

        // Subscribe to real-time changes
        firebaseUnsubscribeRef.current = onSnapshot(docRef, (docSnap) => {
          if (!isSubscribed) return;

          if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.divisions) {
              setDivisions(data.divisions);
              localStorage.setItem('da_divisions', JSON.stringify(data.divisions));
            }
            if (data.assets) {
              setAssets(data.assets);
              localStorage.setItem('da_assets', JSON.stringify(data.assets));
            }
            if (data.trashAssets) {
              let cloudTrash = data.trashAssets;
              const tenDaysAgo = new Date();
              tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
              cloudTrash = cloudTrash.filter(t => t.deletedAt && new Date(t.deletedAt) >= tenDaysAgo);
              setTrashAssets(cloudTrash);
              localStorage.setItem('da_trash', JSON.stringify(cloudTrash));
            }

            // Sync Users lists cleanly using our safe Merge Fix
            let merged = [];
            let needsWriteBack = false;

            if (data.users) {
              const localUsersStr = localStorage.getItem('da_users');
              const localUsers = localUsersStr ? JSON.parse(localUsersStr) : [];
              const cloudEmails = new Set(data.users.map(u => u.email));

              // Only keep local users if they aren't on the cloud list yet
              const onlyLocal = localUsers.filter(u => !cloudEmails.has(u.email));
              if (onlyLocal.length > 0) {
                merged = [...data.users, ...onlyLocal];
                needsWriteBack = true; // Sync our new local users up to the cloud!
              } else {
                merged = [...data.users];
              }
            } else {
              // If cloud snapshot lacks users entirely, seed cloud with local users
              const localUsersStr = localStorage.getItem('da_users');
              merged = localUsersStr ? JSON.parse(localUsersStr) : [];
              needsWriteBack = true;
            }

            setUsers(merged);
            localStorage.setItem('da_users', JSON.stringify(merged));

            if (needsWriteBack) {
              saveStateToFirebase(db, merged, data.divisions || divisions, data.assets || assets);
            }
          } else {
            // Document doesn't exist yet, seed it with our local state
            const currentLocalUsers = JSON.parse(localStorage.getItem('da_users') || '[]');
            saveStateToFirebase(db, currentLocalUsers, divisions, assets);
          }
        }, (err) => {
          console.error("Firestore listen error:", err);
          if (isSubscribed) {
            setIsFirebaseConnected(false);
            setDbStatusDesc('เกิดข้อผิดพลาดในการรับข้อมูล Cloud');
          }
        });

      } catch (err) {
        console.error("Firebase initialization failed:", err);
        if (isSubscribed) {
          setIsFirebaseConnected(false);
          setDbStatusDesc('ข้อมูลโครงสร้าง Config ไม่ถูกต้อง');
        }
      }
    }

    setupFirebase();

    return () => {
      isSubscribed = false;
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, [currentUser, firebaseConfig]);

  // Firestore save wrapper
  const saveStateToFirebase = async (db = firestoreDbRef.current, customUsers = users, customDivs = divisions, customAssets = assets, customTrash = trashAssets) => {
    if (!db) return;
    try {
      const docRef = doc(db, "durable_articles_sys", "office_state");
      await setDoc(docRef, {
        divisions: customDivs,
        assets: customAssets,
        users: customUsers,
        trashAssets: customTrash,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Firestore sync write failed:", err);
      showToast("ไม่สามารถซิงค์ข้อมูลกับคลาวด์ได้ ระบบจัดเก็บข้อมูลในบราวเซอร์แทน", "warning");
    }
  };

  // 5. Global Action Callbacks
  const handleSaveAsset = async (newAsset) => {
    let updated = [];
    const index = assets.findIndex(a => a.id === newAsset.id);
    if (index > -1) {
      updated = [...assets];
      updated[index] = newAsset;
      showToast(`แก้ไขข้อมูลครุภัณฑ์ "${newAsset.name}" เรียบร้อยแล้ว`, "success");
    } else {
      updated = [...assets, newAsset];
      showToast(`ลงทะเบียนครุภัณฑ์ "${newAsset.name}" สำเร็จเรียบร้อย`, "success");
    }

    setAssets(updated);
    localStorage.setItem('da_assets', JSON.stringify(updated));

    if (isFirebaseConnected) {
      await saveStateToFirebase(firestoreDbRef.current, users, divisions, updated, trashAssets);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const updatedAssets = assets.filter(a => a.id !== assetId);
    setAssets(updatedAssets);
    localStorage.setItem('da_assets', JSON.stringify(updatedAssets));

    const deletedItem = {
      ...targetAsset,
      deletedAt: new Date().toISOString()
    };
    const updatedTrash = [deletedItem, ...trashAssets];

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const finalTrash = updatedTrash.filter(t => t.deletedAt && new Date(t.deletedAt) >= tenDaysAgo);

    setTrashAssets(finalTrash);
    localStorage.setItem('da_trash', JSON.stringify(finalTrash));

    showToast(`ย้ายครุภัณฑ์ "${targetAsset.name}" ไปยังถังขยะแล้ว (สามารถกู้คืนได้ภายใน 10 วัน)`, "success");

    if (isFirebaseConnected) {
      await saveStateToFirebase(firestoreDbRef.current, users, divisions, updatedAssets, finalTrash);
    }
  };

  const handleRestoreAsset = async (assetId) => {
    const targetAsset = trashAssets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const updatedTrash = trashAssets.filter(a => a.id !== assetId);
    setTrashAssets(updatedTrash);
    localStorage.setItem('da_trash', JSON.stringify(updatedTrash));

    const { deletedAt, ...restoredAsset } = targetAsset;
    const updatedAssets = [...assets, restoredAsset];
    setAssets(updatedAssets);
    localStorage.setItem('da_assets', JSON.stringify(updatedAssets));

    showToast(`กู้คืนครุภัณฑ์ "${targetAsset.name}" กลับสู่ทะเบียนสำเร็จแล้ว`, "success");

    if (isFirebaseConnected) {
      await saveStateToFirebase(firestoreDbRef.current, users, divisions, updatedAssets, updatedTrash);
    }
  };

  const handlePermanentDeleteAsset = async (assetId) => {
    const targetAsset = trashAssets.find(a => a.id === assetId);
    if (!targetAsset) return;

    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์ "${targetAsset.name}" ทิ้งอย่างถาวร? การดำเนินการนี้ไม่สามารถยกเลิกได้`)) {
      const updatedTrash = trashAssets.filter(a => a.id !== assetId);
      setTrashAssets(updatedTrash);
      localStorage.setItem('da_trash', JSON.stringify(updatedTrash));

      showToast(`ลบครุภัณฑ์ "${targetAsset.name}" ทิ้งถาวรเรียบร้อยแล้ว`, "success");

      if (isFirebaseConnected) {
        await saveStateToFirebase(firestoreDbRef.current, users, divisions, assets, updatedTrash);
      }
    }
  };

  const handleSaveDivisions = async (updatedDivs) => {
    setDivisions(updatedDivs);
    localStorage.setItem('da_divisions', JSON.stringify(updatedDivs));

    if (isFirebaseConnected) {
      await saveStateToFirebase(firestoreDbRef.current, users, updatedDivs, assets, trashAssets);
    }
  };

  const handleSaveUsers = async (updatedUsers) => {
    setUsers(updatedUsers);
    localStorage.setItem('da_users', JSON.stringify(updatedUsers));

    const match = updatedUsers.find(u => u.email === currentUser.email);
    if (match) {
      setCurrentUser(match);
      const userJson = JSON.stringify(match);
      if (localStorage.getItem('da_current_user')) {
        localStorage.setItem('da_current_user', userJson);
      } else {
        sessionStorage.setItem('da_current_user', userJson);
      }
    }

    if (isFirebaseConnected) {
      await saveStateToFirebase(firestoreDbRef.current, updatedUsers, divisions, assets, trashAssets);
    }
  };

  const handleLogout = () => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบเพื่อความปลอดภัยของข้อมูล?")) {
      // Clear Session Cache
      localStorage.removeItem('da_current_user');
      sessionStorage.removeItem('da_current_user');
      setCurrentUser(null);
      setActiveView('dashboard');

      // Wipe dynamic visual tables memory in React state
      setAssets([]);
      setDivisions([]);
      setUsers([]);

      showToast("คุณออกจากระบบเป็นที่เรียบร้อยแล้ว", "info");
    }
  };

  const handleSaveFirebaseConfig = (newConfig) => {
    if (newConfig) {
      localStorage.setItem('da_database_offline', 'false');
      localStorage.setItem('da_firebase_config', JSON.stringify(newConfig));
      setFirebaseConfig(newConfig);
      showToast('บันทึกการตั้งค่าตัวเชื่อมฐานข้อมูลคลาวด์และพยายามเชื่อมต่อใหม่...', 'success');
    } else {
      localStorage.setItem('da_database_offline', 'true');
      localStorage.removeItem('da_firebase_config');
      setFirebaseConfig(null);
      showToast('ยกเลิกตัวเชื่อมต่อฐานข้อมูลคลาวด์เรียบร้อย กลับสู่ระบบจัดเก็บภายในเบราว์เซอร์', 'info');
    }
  };

  // Render view router based on navigation selection with strict security access control guards
  const renderActiveView = () => {
    const isSuperAdmin = (currentUser?.role || '').trim().toLowerCase() === 'super admin';

    switch (activeView) {
      case 'dashboard':
        return <DashboardView assets={assets} theme={theme} />;
      case 'assets':
        return (
          <AssetsView
            assets={assets}
            divisions={divisions}
            currentUser={currentUser}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        );
      case 'org':
        // Secure Backoffice Guard: Only Super Admin can access Org Management
        if (isSuperAdmin) {
          return (
            <OrgView
              divisions={divisions}
              assets={assets}
              currentUser={currentUser}
              onSaveDivisions={handleSaveDivisions}
            />
          );
        } else {
          return <DashboardView assets={assets} theme={theme} />;
        }
      case 'verifier':
        return <VerifierView assets={assets} divisions={divisions} />;
      case 'users':
        // Secure Backoffice Guard: Only Super Admin can access User Management
        if (isSuperAdmin) {
          return (
            <UsersView
              users={users}
              divisions={divisions}
              currentUser={currentUser}
              onSaveUsers={handleSaveUsers}
            />
          );
        } else {
          return <DashboardView assets={assets} theme={theme} />;
        }
      case 'database':
        // Secure Backoffice Guard: Only Super Admin can access Database Configuration
        if (isSuperAdmin) {
          return (
            <DatabaseView
              isFirebaseConnected={isFirebaseConnected}
              dbStatusDesc={dbStatusDesc}
              onSaveFirebaseConfig={handleSaveFirebaseConfig}
              currentConfig={firebaseConfig}
            />
          );
        } else {
          return <DashboardView assets={assets} theme={theme} />;
        }
      case 'trash':
        // Secure Backoffice Guard: Only Super Admin can access Trash Bin
        if (isSuperAdmin) {
          return (
            <TrashView
              trashAssets={trashAssets}
              divisions={divisions}
              onRestore={handleRestoreAsset}
              onPermanentDelete={handlePermanentDeleteAsset}
            />
          );
        } else {
          return <DashboardView assets={assets} theme={theme} />;
        }
      default:
        return <DashboardView assets={assets} theme={theme} />;
    }
  };

  // Document Page Titles mapping
  const activeMetadata = useMemo(() => {
    const meta = {
      dashboard: { title: "แผงวิเคราะห์ภาพรวมข้อมูล", subtitle: "สถิติและมูลค่าสินทรัพย์ครุภัณฑ์โดยรวมทั้งสำนักงาน" },
      assets: { title: "ทะเบียนครุภัณฑ์สำนักงาน", subtitle: "ค้นหา แก้ไข และพิมพ์รายงานข้อมูลครุภัณฑ์ที่ขึ้นทะเบียน" },
      org: { title: "โครงสร้างฝ่ายและกลุ่มงาน", subtitle: "จัดการโครงสร้างแผนกย่อยและการจัดสรรพัสดุในสำนัก" },
      verifier: { title: "เครื่องมือตรวจสอบราคามาตรฐาน", subtitle: "เปรียบเทียบราคาเสนอซื้อกับบัญชีราคามาตรฐานครุภัณฑ์ ธ.ค. 2568 / เกณฑ์ ICT ฉบับปรับปรุง พ.ค. 2569" },
      users: { title: "ระบบจัดการผู้ใช้และระดับสิทธิ์", subtitle: "จัดการระดับสิทธิ์ อนุมัติการเข้าถึง เปลี่ยนรหัสผ่าน และลบผู้ใช้โดย Super Admin" },
      database: { title: "ระบบเชื่อมโยงฐานข้อมูล Cloud", subtitle: "กำหนดค่าและเชื่อมต่อระบบเข้ากับฐานข้อมูลคลาวด์ Google Firestore ไดรเวอร์โดยตรงแบบเรียลไทม์" },
      trash: { title: "ถังขยะและกู้คืนข้อมูลระบบ", subtitle: "กู้ข้อมูลครุภัณฑ์พัสดุที่ถูกลบไม่เกิน 10 วัน หรือกดลบทิ้งอย่างถาวรโดย Super Admin" }
    };
    return meta[activeView] || meta.dashboard;
  }, [activeView]);

  return (
    <>
      {/* 1. SECURE AUTH OVERLAY (When session not verified) */}
      {!currentUser && (
        <AuthScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            // Re-load app dynamic data structures on login success
            const localDivs = localStorage.getItem('da_divisions');
            setDivisions(localDivs ? JSON.parse(localDivs) : initialDivisions);
            const localAssets = localStorage.getItem('da_assets');
            setAssets(localAssets ? JSON.parse(localAssets) : initialAssets);
            const localUsers = localStorage.getItem('da_users');
            setUsers(localUsers ? JSON.parse(localUsers) : []);
            const localTrash = localStorage.getItem('da_trash');
            setTrashAssets(localTrash ? JSON.parse(localTrash) : []);
          }}
          divisions={divisions}
          firestoreDb={firestoreDbRef.current}
          isFirebaseConnected={isFirebaseConnected}
        />
      )}

      {/* 2. AUTHENTICATED WORKSPACE WORK ENVIRONMENT */}
      {currentUser && (
        <div className="app-container">
          {/* Mobile Header Bar */}
          <div className="mobile-header-bar">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
            <div className="mobile-brand-title">
              <h2>ระบบครุภัณฑ์ SASUK YALA</h2>
            </div>
            <button className="mobile-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              <svg viewBox="0 0 24 24">
                {theme === 'light' ? (
                  <path d="M12 3c.13 0 .26 0 .38.02C9.24 4.9 7.45 8.22 7.45 12c0 3.78 1.79 7.1 4.93 8.98-.12.02-.25.02-.38.02-4.97 0-9-4.03-9-9s4.03-9 9-9z" />
                ) : (
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm-1.06-10.9c-.39-.39-.39-1.03 0-1.41l1.06-1.06c.39-.39 1.03-.39 1.41 0s.39 1.03 0 1.41l-1.06 1.06c-.39.39-1.02.39-1.41 0zM5.99 18.36c-.39-.39-.39-1.03 0-1.41l1.06-1.06c.39-.39 1.03-.39 1.41 0s.39 1.03 0 1.41l-1.06 1.06c-.39.39-1.03.39-1.41 0z" />
                )}
              </svg>
            </button>
          </div>

          {/* Sidebar Backdrop Overlay */}
          {isSidebarOpen && (
            <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
          )}

          <Sidebar
            currentUser={currentUser}
            activeView={activeView}
            setActiveView={setActiveView}
            onLogout={handleLogout}
            isFirebaseConnected={isFirebaseConnected}
            dbStatusDesc={dbStatusDesc}
            divisions={divisions}
            isMobileOpen={isSidebarOpen}
            setIsMobileOpen={setIsSidebarOpen}
          />

          <main className="main-content">
            <header className="content-header">
              <div className="header-title">
                <h1 id="view-title">{activeMetadata.title}</h1>
                <p id="view-subtitle">{activeMetadata.subtitle}</p>
              </div>
              <div className="header-controls">
                <button
                  id="theme-toggle"
                  className="theme-toggle-btn"
                  title="เปลี่ยนธีม"
                  onClick={toggleTheme}
                >
                  <svg viewBox="0 0 24 24">
                    {theme === 'light' ? (
                      <path d="M12 3c.13 0 .26 0 .38.02C9.24 4.9 7.45 8.22 7.45 12c0 3.78 1.79 7.1 4.93 8.98-.12.02-.25.02-.38.02-4.97 0-9-4.03-9-9s4.03-9 9-9z" />
                    ) : (
                      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm-1.06-10.9c-.39-.39-.39-1.03 0-1.41l1.06-1.06c.39-.39 1.03-.39 1.41 0s.39 1.03 0 1.41l-1.06 1.06c-.39.39-1.02.39-1.41 0zM5.99 18.36c-.39-.39-.39-1.03 0-1.41l1.06-1.06c.39-.39 1.03-.39 1.41 0s.39 1.03 0 1.41l-1.06 1.06c-.39.39-1.03.39-1.41 0z" />
                    )}
                  </svg>
                </button>
              </div>
            </header>

            {/* Content Display viewport */}
            {renderActiveView()}
          </main>
        </div>
      )}

      {/* Dynamic Toast notifications portal container */}
      <div id="toast-container" className="toast-container"></div>
    </>
  );
}
