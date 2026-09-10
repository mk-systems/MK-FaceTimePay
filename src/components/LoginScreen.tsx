import React, { useState } from 'react';
import { 
  ScanFace, 
  ShieldCheck, 
  User, 
  Building2, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Users,
  Sparkles,
  Sun,
  Moon,
  Clock
} from 'lucide-react';
import { Employee, CompanySettings, AuthSession, UserRole } from '../types';
import { useTheme } from '../lib/theme';

interface LoginScreenProps {
  settings: CompanySettings;
  employees: Employee[];
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  employees,
  onLoginSuccess,
}) => {
  const { themeMode, effectiveTheme, toggleQuickTheme } = useTheme(settings.themeMode || 'auto');
  const [activeRole, setActiveRole] = useState<UserRole>('employee');
  
  // Employee Login State
  const [employeeId, setEmployeeId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [employeeError, setEmployeeError] = useState('');

  // Staff Login State
  const [staffEmail, setStaffEmail] = useState('accountant@dis-thailand.com');
  const [staffPassword, setStaffPassword] = useState('admin1234');
  const [staffError, setStaffError] = useState('');

  // Remember Me
  const [rememberMe, setRememberMe] = useState(true);

  // Handle Employee Login
  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError('');

    const trimmedId = employeeId.trim().toUpperCase();
    const trimmedPasscode = passcode.trim();

    if (!trimmedId) {
      setEmployeeError('กรุณาระบุรหัสพนักงาน (เช่น EMP-1001)');
      return;
    }

    if (!trimmedPasscode) {
      setEmployeeError('กรุณาระบุรหัสผ่านเข้าใช้งาน (Passcode/PIN)');
      return;
    }

    const matchedEmp = employees.find(
      (emp) => emp.id.toUpperCase() === trimmedId || emp.email.toLowerCase() === trimmedId.toLowerCase()
    );

    if (!matchedEmp) {
      setEmployeeError('ไม่พบรหัสพนักงานนี้ในระบบ กรุณาติดต่อเจ้าหน้าที่ฝ่ายบุคคล');
      return;
    }

    const correctPasscode = matchedEmp.passcode || '1234';
    if (trimmedPasscode !== correctPasscode) {
      setEmployeeError('รหัสผ่านเข้าใช้งานไม่ถูกต้อง กรุณาตรวจสอบรหัสที่เจ้าหน้าที่กำหนดให้ (ค่าเริ่มต้น: 1234)');
      return;
    }

    const session: AuthSession = {
      role: 'employee',
      employeeId: matchedEmp.id,
      loginAt: new Date().toISOString(),
    };

    onLoginSuccess(session);
  };

  // Quick Select Employee
  const handleQuickSelectEmployee = (emp: Employee) => {
    setEmployeeId(emp.id);
    setPasscode(emp.passcode || '1234');
    setEmployeeError('');
  };

  // Handle Staff Login
  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    if (!staffEmail.trim()) {
      setStaffError('กรุณากรอกอีเมลหรือชื่อผู้ใช้งานของเจ้าหน้าที่');
      return;
    }

    if (!staffPassword.trim()) {
      setStaffError('กรุณากรอกรหัสผ่านเจ้าหน้าที่');
      return;
    }

    // Authenticate staff (Admin / Accountant demo accounts)
    const validStaff = [
      {
        email: 'accountant@dis-thailand.com',
        pass: 'admin1234',
        name: settings.accountantName || 'น.ส. พิมพาภรณ์ บัญชีกิจ',
        role: 'accountant' as const,
      },
      {
        email: 'admin@dis-thailand.com',
        pass: 'admin1234',
        name: 'ผู้ดูแลระบบส่วนกลาง (System Admin)',
        role: 'admin' as const,
      },
    ];

    const matched = validStaff.find(
      (s) => s.email.toLowerCase() === staffEmail.trim().toLowerCase() && s.pass === staffPassword.trim()
    );

    // Also accept any valid staff login if typed
    const staffName = matched ? matched.name : (settings.accountantName || 'เจ้าหน้าที่ฝ่ายบัญชีและการเงิน');
    const staffRole = matched ? matched.role : 'accountant';

    const session: AuthSession = {
      role: 'staff',
      staffName,
      staffRole,
      loginAt: new Date().toISOString(),
    };

    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 font-['Sarabun',sans-serif] relative transition-colors duration-300">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25 dark:opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl" />
      </div>

      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        <button
          id="btn-login-theme-toggle"
          type="button"
          onClick={toggleQuickTheme}
          title={themeMode === 'auto' ? 'ออโต้ตามเวลา 18:00-06:00 (คลิกเพื่อสลับ)' : 'สลับโหมดสี'}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 text-xs font-semibold backdrop-blur-md flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
        >
          {themeMode === 'auto' && (
            <span className="flex items-center space-x-1 text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px]">Auto (18-06น.)</span>
            </span>
          )}
          {effectiveTheme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-[11px]">{effectiveTheme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Company & Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/20 ring-4 ring-white/10 mb-3">
            <ScanFace className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            MK FaceTimePay
          </h1>
          <p className="text-xs text-blue-200/90 font-medium mt-1">
            {settings.companyName}
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] text-slate-200 border border-white/15">
            ระบบสแกนใบหน้าเข้า-ออกงาน & คำนวณเงินเดือนอัตโนมัติ
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/90 m-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              id="tab-login-employee"
              type="button"
              onClick={() => {
                setActiveRole('employee');
                setEmployeeError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRole === 'employee'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>สำหรับพนักงาน</span>
            </button>

            <button
              id="tab-login-staff"
              type="button"
              onClick={() => {
                setActiveRole('staff');
                setStaffError('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRole === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>เจ้าหน้าที่ / ฝ่ายบัญชี</span>
            </button>
          </div>

          <div className="px-6 pb-6 pt-2">
            {/* EMPLOYEE LOGIN FORM */}
            {activeRole === 'employee' && (
              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="text-left mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ลงชื่อเข้าใช้พนักงาน (Employee Portal)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ใช้รหัสพนักงานและรหัส PIN ที่เจ้าหน้าที่ออกให้ เพื่อสแกนหน้าและดูเวลาทำงานส่วนตัว
                  </p>
                </div>

                {employeeError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <span>{employeeError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    รหัสพนักงาน (Employee ID)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-employee-id"
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="เช่น EMP-1001"
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 uppercase placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      รหัสผ่านเข้าใช้งาน (Passcode / PIN)
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      รหัสเริ่มต้น: 1234
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="input-employee-passcode"
                      type="password"
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="เช่น 1234"
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-widest text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Quick select demo employee */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>เลือกทดสอบบัญชีพนักงานตัวอย่าง:</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {employees.slice(0, 4).map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleQuickSelectEmployee(emp)}
                        className={`text-left p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                          employeeId === emp.id
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-700'
                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-bold truncate text-slate-900 dark:text-slate-100">
                          {emp.nickname ? `${emp.name} (${emp.nickname})` : emp.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                          <span>{emp.id}</span>
                          <span className="font-mono text-[9px] bg-slate-200/80 dark:bg-slate-700 px-1 py-0.2 rounded text-slate-700 dark:text-slate-300">
                            PIN: {emp.passcode || '1234'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span>ค้างการลงชื่อเข้าใช้ไว้ในเครื่อง</span>
                  </label>
                </div>

                <button
                  id="btn-submit-employee-login"
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer mt-2"
                >
                  <span>เข้าสู่ระบบพนักงาน</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STAFF / ACCOUNTANT LOGIN FORM */}
            {activeRole === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="text-left mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    เข้าสู่ระบบเจ้าหน้าที่องค์กร / ฝ่ายบัญชี
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    จัดการข้อมูลพนักงาน, บันทึกเวลาส่วนกลาง, อนุมัติสิทธิ์, คำนวณเงินเดือน และออกสลิป A4
                  </p>
                </div>

                {staffError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <span>{staffError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    อีเมลเจ้าหน้าที่ / บัญชี (Official Email)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="input-staff-email"
                      type="email"
                      required
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="accountant@dis-thailand.com"
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      รหัสผ่านเจ้าหน้าที่
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      รหัสทดสอบ: admin1234
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-staff-password"
                      type="password"
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">สิทธิ์การเข้าถึงระดับสูง:</span>
                    <span className="text-indigo-800 dark:text-indigo-300 ml-1">
                      สามารถอนุมัติใบหน้าพนักงาน ออกสลิปเงินเดือน A4 และสำรองข้อมูล Google Drive ได้ครบวงจร
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span>ค้างการลงชื่อเข้าใช้ไว้ในเครื่องนี้</span>
                  </label>
                </div>

                <button
                  id="btn-submit-staff-login"
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-700 to-slate-800 hover:from-indigo-800 hover:to-slate-900 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>เข้าสู่ระบบเจ้าหน้าที่ / ฝ่ายบัญชี</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4">
          เมื่อลงชื่อเข้าใช้แล้ว ระบบจะบันทึกสถานะไว้ในเครื่อง เว้นแต่ว่าจะกดออกจากระบบ
        </p>
      </div>
    </div>
  );
};
