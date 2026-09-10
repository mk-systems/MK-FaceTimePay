import React, { useState, useEffect } from 'react';
import { Employee, AttendanceLog, CompanySettings, MonthlyPayrollSummary, AuthSession } from './types';
import { 
  getEmployees, 
  getAttendanceLogs, 
  getCompanySettings, 
  subscribeToRealtimeUpdates,
  calculateMonthlyPayroll,
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  initFirebaseSync
} from './lib/storage';
import { Navbar, ActiveTab } from './components/Navbar';
import { FaceScanKiosk } from './components/FaceScanKiosk';
import { RealtimeAttendanceView } from './components/RealtimeAttendanceView';
import { PayrollDashboard } from './components/PayrollDashboard';
import { AccountantApprovalPanel } from './components/AccountantApprovalPanel';
import { EmployeeManagement } from './components/EmployeeManagement';
import { CompanySettingsManagement } from './components/CompanySettingsManagement';
import { DriveBackupTab } from './components/DriveBackupTab';
import { GoogleExportDriveModal } from './components/GoogleExportDriveModal';
import { LoginScreen } from './components/LoginScreen';
import { EmployeePortal } from './components/EmployeePortal';
import { useTheme } from './lib/theme';

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getAuthSession());
  const [activeTab, setActiveTab] = useState<ActiveTab>('kiosk');
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => getAttendanceLogs());
  const [settings, setSettings] = useState<CompanySettings>(() => getCompanySettings());
  const [globalExportSummary, setGlobalExportSummary] = useState<MonthlyPayrollSummary | null>(null);

  // Initialize and synchronize global theme state
  const { themeMode } = useTheme(settings.themeMode || 'light');

  // Load initial data and subscribe to real-time events across windows/tabs and Firebase
  useEffect(() => {
    initFirebaseSync();
    setEmployees(getEmployees());
    setAttendanceLogs(getAttendanceLogs());
    setSettings(getCompanySettings());

    const unsubscribe = subscribeToRealtimeUpdates((event) => {
      if (event.type === 'ATTENDANCE_LOGGED') {
        setAttendanceLogs((prev) => [event.payload, ...prev]);
      } else if (event.type === 'EMPLOYEE_UPDATED') {
        setEmployees(getEmployees());
      } else if (event.type === 'EMPLOYEE_APPROVED') {
        setEmployees(getEmployees());
      } else if (event.type === 'SETTINGS_UPDATED') {
        setSettings(event.payload);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshData = () => {
    setEmployees(getEmployees());
    setAttendanceLogs(getAttendanceLogs());
    setSettings(getCompanySettings());
  };

  const handleLoginSuccess = (session: AuthSession) => {
    saveAuthSession(session);
    setAuthSession(session);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
  };

  const handleOpenExportModal = () => {
    const period = '2026-09';
    const computed = calculateMonthlyPayroll(period);
    setGlobalExportSummary(computed);
  };

  // If not authenticated, render clear Role-based Login Screen
  if (!authSession) {
    return (
      <LoginScreen
        settings={settings}
        employees={employees}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // If logged in as Employee, render dedicated Employee Portal
  if (authSession.role === 'employee') {
    return (
      <EmployeePortal
        employeeId={authSession.employeeId || (employees[0] ? employees[0].id : 'EMP-1001')}
        employees={employees}
        attendanceLogs={attendanceLogs}
        settings={settings}
        onLogout={handleLogout}
        onRefreshData={refreshData}
      />
    );
  }

  // If logged in as Staff / Admin, render full Administrative Suite
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-['Sarabun',sans-serif] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        settings={settings}
        employees={employees}
        staffName={authSession.staffName}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'kiosk' && (
          <FaceScanKiosk
            employees={employees}
            onNavigateToApproval={() => setActiveTab('approval')}
          />
        )}

        {activeTab === 'attendance' && (
          <RealtimeAttendanceView
            logs={attendanceLogs}
            employees={employees}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollDashboard
            settings={settings}
            onOpenExportModal={handleOpenExportModal}
          />
        )}

        {activeTab === 'approval' && (
          <AccountantApprovalPanel
            employees={employees}
            settings={settings}
            onEmployeeApproved={refreshData}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManagement
            employees={employees}
          />
        )}

        {activeTab === 'settings' && (
          <CompanySettingsManagement
            settings={settings}
            onSettingsSaved={(newSettings) => {
              setSettings(newSettings);
              refreshData();
            }}
          />
        )}

        {activeTab === 'backup' && (
          <DriveBackupTab
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
          />
        )}
      </main>

      {/* Footer (Hidden during printing) */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-800 dark:text-slate-200">{settings.companyName}</strong> • ระบบบันทึกเวลาสแกนหน้าและคำนวณเงินเดือนอัตโนมัติ
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span>มาตรฐานสลิป A4 แนวตั้ง</span>
            <span>•</span>
            <span>สำรองข้อมูล Google Drive</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Firebase Ready</span>
          </div>
        </div>
      </footer>

      {/* Global Google Export / Drive Modal */}
      {globalExportSummary && (
        <GoogleExportDriveModal
          summary={globalExportSummary}
          settings={settings}
          onClose={() => setGlobalExportSummary(null)}
        />
      )}
    </div>
  );
}
