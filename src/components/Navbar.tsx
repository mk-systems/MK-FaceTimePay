import React from 'react';
import { 
  ScanFace, 
  Clock, 
  ReceiptText, 
  Users, 
  ShieldCheck, 
  CloudUpload,
  Building2,
  Bell,
  LogOut,
  Sun,
  Moon,
  Laptop,
  CalendarDays
} from 'lucide-react';
import { CompanySettings, Employee, LeaveRequest } from '../types';
import { useTheme } from '../lib/theme';

export type ActiveTab = 'kiosk' | 'attendance' | 'payroll' | 'approval' | 'leave' | 'employees' | 'settings' | 'backup';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  settings: CompanySettings;
  employees: Employee[];
  leaveRequests?: LeaveRequest[];
  staffName?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  settings,
  employees,
  leaveRequests = [],
  staffName,
  onLogout,
}) => {
  const pendingCount = employees.filter(e => e.approvalStatus === 'pending_accountant').length;
  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length;
  const { themeMode, effectiveTheme, toggleQuickTheme, setTheme } = useTheme(settings.themeMode || 'light');

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs no-print transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100 dark:ring-blue-900/50">
              <ScanFace className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">MK FaceTimePay</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-xs md:max-w-md">
                {settings.companyName}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1 xl:space-x-1.5 overflow-x-auto py-1">
            <button
              id="nav-tab-kiosk"
              onClick={() => onSelectTab('kiosk')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'kiosk'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ScanFace className="w-4 h-4 shrink-0" />
              <span>ตู้สแกนหน้า</span>
            </button>

            <button
              id="nav-tab-attendance"
              onClick={() => onSelectTab('attendance')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>บันทึกเรียลไทม์</span>
            </button>

            <button
              id="nav-tab-payroll"
              onClick={() => onSelectTab('payroll')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'payroll'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ReceiptText className="w-4 h-4 shrink-0" />
              <span>สรุปเงินเดือน & สลิป</span>
            </button>

            <button
              id="nav-tab-approval"
              onClick={() => onSelectTab('approval')}
              className={`relative flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'approval'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>อนุมัติบัญชี</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-leave"
              onClick={() => onSelectTab('leave')}
              className={`relative flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'leave'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>อนุมัติการลา</span>
              {pendingLeaveCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                  {pendingLeaveCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-employees"
              onClick={() => onSelectTab('employees')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'employees'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>จัดการพนักงาน</span>
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => onSelectTab('settings')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>ข้อมูลบริษัท & ปกส.</span>
            </button>

            <button
              id="nav-tab-backup"
              onClick={() => onSelectTab('backup')}
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CloudUpload className="w-4 h-4 shrink-0" />
              <span>สำรอง Drive</span>
            </button>
          </nav>

          {/* Quick status pill, Theme Switcher & Staff Profile / Logout */}
          <div className="flex items-center space-x-2">
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>ระบบพร้อมสแกน</span>
            </div>

            {/* Quick Dark Mode Toggle Button */}
            <button
              id="btn-navbar-theme-toggle"
              type="button"
              onClick={toggleQuickTheme}
              title={effectiveTheme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center"
              aria-label="สลับโหมดธีมสว่าง/มืด"
            >
              {effectiveTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in zoom-in" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in zoom-in" />
              )}
            </button>

            {staffName && (
              <div className="hidden md:flex items-center space-x-1.5 pl-2 border-l border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold truncate max-w-[130px]" title={staffName}>
                  {staffName}
                </span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded font-medium">
                  เจ้าหน้าที่
                </span>
              </div>
            )}

            {onLogout && (
              <button
                id="btn-staff-logout"
                onClick={onLogout}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-all cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar with smooth touch scrolling */}
        <div className="flex md:hidden overflow-x-auto py-2.5 px-1 space-x-1.5 border-t border-slate-100 dark:border-slate-800 scroll-smooth touch-pan-x -mx-4 sm:-mx-6 px-4 sm:px-6">
          <button
            onClick={() => onSelectTab('kiosk')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'kiosk' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <ScanFace className="w-3.5 h-3.5 shrink-0" />
            <span>สแกนหน้า</span>
          </button>
          <button
            onClick={() => onSelectTab('attendance')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>บันทึกเรียลไทม์</span>
          </button>
          <button
            onClick={() => onSelectTab('payroll')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5 shrink-0" />
            <span>สรุปเงินเดือน & สลิป</span>
          </button>
          <button
            onClick={() => onSelectTab('approval')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap relative flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'approval' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>อนุมัติบัญชี</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('leave')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap relative flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'leave' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>อนุมัติการลา</span>
            {pendingLeaveCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                {pendingLeaveCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('employees')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'employees' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>จัดการพนักงาน</span>
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>ข้อมูลบริษัท</span>
          </button>
          <button
            onClick={() => onSelectTab('backup')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
              activeTab === 'backup' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:bg-slate-200'
            }`}
          >
            <CloudUpload className="w-3.5 h-3.5 shrink-0" />
            <span>สำรอง Drive</span>
          </button>
          <button
            type="button"
            onClick={toggleQuickTheme}
            className="px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap text-slate-700 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 shrink-0 active:bg-slate-200 cursor-pointer"
          >
            {effectiveTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>โหมดสว่าง</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 shrink-0 text-slate-700" />
                <span>โหมดมืด</span>
              </>
            )}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center space-x-1.5 shrink-0 active:bg-red-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
