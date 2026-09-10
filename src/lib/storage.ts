import { Employee, AttendanceLog, MonthlyPayrollSummary, CompanySettings, PayrollRecord, AuthSession } from '../types';
import { initialCompanySettings, initialEmployees, generateSeedAttendanceLogs, initialWorkLocations } from '../data/initialData';
import { numberToThaiBahtText } from './thaiBahtText';
import { 
  saveCompanySettingsToFirestore, 
  saveEmployeeToFirestore, 
  saveEmployeesBatchToFirestore, 
  saveAttendanceLogToFirestore, 
  savePayrollSummaryToFirestore,
  syncCompanySettingsFromFirestore,
  syncEmployeesFromFirestore,
  syncAttendanceLogsFromFirestore,
  syncPayrollFromFirestore
} from './firebase';

const STORAGE_KEYS = {
  EMPLOYEES: 'ftp_employees_v1',
  ATTENDANCE: 'ftp_attendance_v1',
  PAYROLL: 'ftp_payroll_summaries_v1',
  SETTINGS: 'ftp_company_settings_v1',
  AUTH_SESSION: 'ftp_auth_session_v1',
};

// Real-time synchronization channel for cross-tab or kiosk-to-dashboard instant updates
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('facetimepay_realtime_sync')
  : null;

export type RealtimeEvent = 
  | { type: 'ATTENDANCE_LOGGED'; payload: AttendanceLog }
  | { type: 'EMPLOYEE_UPDATED'; payload: Employee }
  | { type: 'EMPLOYEE_APPROVED'; payload: { employeeId: string; approvedBy: string } }
  | { type: 'PAYROLL_GENERATED'; payload: MonthlyPayrollSummary }
  | { type: 'SETTINGS_UPDATED'; payload: CompanySettings };

const listeners = new Set<(event: RealtimeEvent) => void>();

let isFirebaseSynced = false;

export function initFirebaseSync() {
  if (isFirebaseSynced) return;
  isFirebaseSynced = true;

  syncCompanySettingsFromFirestore((settings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    listeners.forEach(cb => cb({ type: 'SETTINGS_UPDATED', payload: settings }));
  });

  syncEmployeesFromFirestore((employees) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    employees.forEach(emp => {
      listeners.forEach(cb => cb({ type: 'EMPLOYEE_UPDATED', payload: emp }));
    });
  });

  syncAttendanceLogsFromFirestore((logs) => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
    if (logs.length > 0) {
      listeners.forEach(cb => cb({ type: 'ATTENDANCE_LOGGED', payload: logs[0] }));
    }
  });

  syncPayrollFromFirestore((summaries) => {
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(summaries));
    Object.values(summaries).forEach(summary => {
      listeners.forEach(cb => cb({ type: 'PAYROLL_GENERATED', payload: summary }));
    });
  });
}

export function subscribeToRealtimeUpdates(callback: (event: RealtimeEvent) => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function broadcastEvent(event: RealtimeEvent) {
  // Notify local in-memory listeners
  listeners.forEach(cb => cb(event));
  // Notify other tabs/windows in real time
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch {
      // ignore
    }
  }
}

if (broadcastChannel) {
  broadcastChannel.onmessage = (ev) => {
    if (ev.data && typeof ev.data === 'object' && ev.data.type) {
      listeners.forEach(cb => cb(ev.data));
    }
  };
}

// Company Settings
export function getCompanySettings(): CompanySettings {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...initialCompanySettings,
        ...parsed,
        enableSocialSecurity: parsed.enableSocialSecurity !== undefined ? parsed.enableSocialSecurity : true,
        socialSecurityRate: parsed.socialSecurityRate ?? 5,
        socialSecurityMaxBase: parsed.socialSecurityMaxBase ?? 15000,
        enableWithholdingTax: parsed.enableWithholdingTax !== undefined ? parsed.enableWithholdingTax : true,
        enableLogo: parsed.enableLogo !== undefined ? parsed.enableLogo : false,
        logoUrl: parsed.logoUrl || '',
        themeMode: parsed.themeMode || 'light',
        enableGpsVerification: parsed.enableGpsVerification !== undefined ? parsed.enableGpsVerification : false,
        workLocations: Array.isArray(parsed.workLocations) && parsed.workLocations.length > 0 
          ? parsed.workLocations 
          : initialWorkLocations,
      };
    } catch {
      // ignore
    }
  }
  return initialCompanySettings;
}

export function saveCompanySettings(settings: CompanySettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  saveCompanySettingsToFirestore(settings);
  broadcastEvent({ type: 'SETTINGS_UPDATED', payload: settings });
}

// Auth Session Management (Persistent login until explicitly logged out)
export function getAuthSession(): AuthSession | null {
  const saved = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return null;
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
}

// Employees
export function getEmployees(): Employee[] {
  const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  if (saved) {
    try {
      const parsed: Employee[] = JSON.parse(saved);
      // Ensure each employee has a passcode (defaults to 1234)
      return parsed.map(e => ({
        ...e,
        passcode: e.passcode || '1234'
      }));
    } catch {
      // ignore
    }
  }
  // Initialize with seed data
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
  return initialEmployees;
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  saveEmployeesBatchToFirestore(employees);
}

export function addEmployee(employee: Employee): void {
  const current = getEmployees();
  const updated = [employee, ...current];
  saveEmployees(updated);
  saveEmployeeToFirestore(employee);
  broadcastEvent({ type: 'EMPLOYEE_UPDATED', payload: employee });
}

export function updateEmployee(updatedEmp: Employee, oldId?: string): void {
  const targetId = oldId || updatedEmp.id;
  const current = getEmployees();
  const index = current.findIndex(e => e.id === targetId);
  if (index !== -1) {
    current[index] = updatedEmp;
    saveEmployees(current);
    saveEmployeeToFirestore(updatedEmp);

    // If employee ID was modified, propagate ID to historical attendance logs and active auth session
    if (oldId && oldId !== updatedEmp.id) {
      const logs = getAttendanceLogs();
      const updatedLogs = logs.map(l => {
        if (l.employeeId === oldId) {
          return {
            ...l,
            employeeId: updatedEmp.id,
            employeeName: updatedEmp.name,
            department: updatedEmp.department,
          };
        }
        return l;
      });
      saveAttendanceLogs(updatedLogs);

      const session = getAuthSession();
      if (session && session.employeeId === oldId) {
        session.employeeId = updatedEmp.id;
        saveAuthSession(session);
      }
    }

    broadcastEvent({ type: 'EMPLOYEE_UPDATED', payload: updatedEmp });
  }
}

export function approveEmployeeByAccountant(employeeId: string, accountantName: string): boolean {
  const current = getEmployees();
  const emp = current.find(e => e.id === employeeId);
  if (!emp) return false;

  emp.approvalStatus = 'approved';
  emp.approvedBy = accountantName;
  emp.approvedAt = new Date().toISOString();
  saveEmployees(current);
  saveEmployeeToFirestore(emp);

  broadcastEvent({
    type: 'EMPLOYEE_APPROVED',
    payload: { employeeId, approvedBy: accountantName },
  });
  return true;
}

export function rejectEmployeeByAccountant(employeeId: string, reason: string): boolean {
  const current = getEmployees();
  const emp = current.find(e => e.id === employeeId);
  if (!emp) return false;

  emp.approvalStatus = 'rejected';
  emp.rejectionReason = reason;
  saveEmployees(current);
  saveEmployeeToFirestore(emp);

  broadcastEvent({
    type: 'EMPLOYEE_UPDATED',
    payload: emp,
  });
  return true;
}

// Attendance Logs
export function getAttendanceLogs(): AttendanceLog[] {
  const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (saved) {
    try {
      const parsed: AttendanceLog[] = JSON.parse(saved);
      const seen = new Set<string>();
      const uniqueLogs: AttendanceLog[] = [];
      for (const log of parsed) {
        if (log && log.id && !seen.has(log.id)) {
          seen.add(log.id);
          uniqueLogs.push(log);
        }
      }
      return uniqueLogs;
    } catch {
      // ignore
    }
  }
  // Seed initial logs
  const employees = getEmployees();
  const seed = generateSeedAttendanceLogs(employees);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seed));
  return seed;
}

export function saveAttendanceLogs(logs: AttendanceLog[]): void {
  const seen = new Set<string>();
  const uniqueLogs: AttendanceLog[] = [];
  for (const log of logs) {
    if (log && log.id && !seen.has(log.id)) {
      seen.add(log.id);
      uniqueLogs.push(log);
    }
  }
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(uniqueLogs));
}

export function recordAttendanceScan(log: AttendanceLog): void {
  const current = getAttendanceLogs();
  const existingIndex = current.findIndex(l => l.id === log.id);
  let updated: AttendanceLog[];
  if (existingIndex !== -1) {
    current[existingIndex] = log;
    updated = [...current];
  } else {
    updated = [log, ...current];
  }
  saveAttendanceLogs(updated);
  saveAttendanceLogToFirestore(log);
  broadcastEvent({ type: 'ATTENDANCE_LOGGED', payload: log });
}

// Monthly Payroll Calculation Engine (1-Click Summary)
export function calculateMonthlyPayroll(periodMonth: string): MonthlyPayrollSummary {
  const employees = getEmployees().filter(e => e.isActive && e.approvalStatus === 'approved');
  const allLogs = getAttendanceLogs();
  const settings = getCompanySettings();

  // Extract month and year from periodMonth (e.g. "2026-09")
  const [yearStr, monthStr] = periodMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiYear = year + 543;
  const periodName = `${thaiMonthNames[monthIdx]} ${thaiYear}`;

  // Filter logs for this month
  const monthLogs = allLogs.filter(log => log.date.startsWith(periodMonth));

  // Determine standard working days in month (excluding Sundays)
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  let defaultScheduledDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, monthIdx, d).getDay();
    if (dayOfWeek !== 0) defaultScheduledDays++; // 6-day week default
  }

  const records: PayrollRecord[] = employees.map(emp => {
    const empLogs = monthLogs.filter(l => l.employeeId === emp.id);

    // Group logs by date to calculate daily worked status
    const logsByDate = new Map<string, { checkIn?: AttendanceLog; checkOut?: AttendanceLog }>();
    empLogs.forEach(l => {
      const existing = logsByDate.get(l.date) || {};
      if (l.type === 'check_in') {
        existing.checkIn = l;
      } else if (l.type === 'check_out') {
        existing.checkOut = l;
      }
      logsByDate.set(l.date, existing);
    });

    const actualWorkDays = logsByDate.size;
    
    // Calculate total late minutes and OT hours
    let totalLateMinutes = 0;
    let totalOtMinutes = 0;

    empLogs.forEach(l => {
      if (l.type === 'check_in' && l.lateMinutes > 0) {
        totalLateMinutes += l.lateMinutes;
      }
      if (l.type === 'check_out' && l.otMinutes > 0) {
        totalOtMinutes += l.otMinutes;
      }
    });

    const totalOtHours = Math.round((totalOtMinutes / 60) * 10) / 10;

    // Calculate Base Pay
    let earnedBasePay = 0;
    if (emp.wageType === 'monthly') {
      earnedBasePay = emp.baseSalary;
    } else if (emp.wageType === 'daily') {
      earnedBasePay = emp.baseSalary * actualWorkDays;
    } else {
      // hourly
      earnedBasePay = emp.baseSalary * (actualWorkDays * 8);
    }

    // Late penalty deduction
    const lateDeduction = settings.latePenaltyPerMinute > 0
      ? totalLateMinutes * settings.latePenaltyPerMinute
      : Math.round((emp.baseSalary / (defaultScheduledDays * 8 * 60)) * totalLateMinutes);

    // Overtime pay
    const otPay = Math.round(totalOtHours * emp.otRatePerHour);

    // Allowances
    const allowances = { ...emp.allowances };
    // If late > 60 mins, forfeit diligence allowance
    if (totalLateMinutes > 60) {
      allowances.diligence = 0;
    }
    const totalAllowances = allowances.position + allowances.transport + allowances.meal + allowances.diligence + allowances.other;

    const grossIncome = earnedBasePay + otPay + totalAllowances;

    // Social Security: Capped between 1,650 and 15,000 THB wage base (or custom base)
    // If company does NOT enable social security, deduction is 0 THB
    let socialSecurity = 0;
    const isCompanySsoEnabled = settings.enableSocialSecurity !== false;
    if (isCompanySsoEnabled && emp.socialSecurity) {
      const maxBase = settings.socialSecurityMaxBase || 15000;
      const rate = (settings.socialSecurityRate ?? 5) / 100;
      const ssoBase = Math.min(maxBase, Math.max(1650, earnedBasePay));
      socialSecurity = Math.round(ssoBase * rate);
    }

    // Withholding tax
    const isTaxEnabled = settings.enableWithholdingTax !== false;
    const withholdingTax = isTaxEnabled ? Math.round(grossIncome * (emp.withholdingTaxRate / 100)) : 0;

    const totalDeductions = lateDeduction + socialSecurity + withholdingTax;
    const netPay = Math.max(0, grossIncome - totalDeductions);
    const netPayThaiText = numberToThaiBahtText(netPay);

    return {
      id: `PAY-${emp.id}-${periodMonth}`,
      employeeId: emp.id,
      employeeName: emp.name,
      nickname: emp.nickname,
      department: emp.department,
      position: emp.position,
      email: emp.email,
      bankAccount: {
        bankName: 'ธนาคารกสิกรไทย (KBANK)',
        accountNumber: `741-2-${emp.id.replace(/\D/g, '').padStart(5, '0')}-9`,
        accountName: emp.name,
      },
      periodMonth,
      periodName,
      wageType: emp.wageType,
      baseSalary: emp.baseSalary,
      scheduledDays: emp.shift.workDaysPerWeek === 5 ? Math.round(defaultScheduledDays * (5/6)) : defaultScheduledDays,
      actualWorkDays,
      totalLateMinutes,
      lateDeduction,
      totalOtHours,
      otPay,
      earnedBasePay,
      allowances,
      totalAllowances,
      grossIncome,
      socialSecurity,
      withholdingTax,
      otherDeductions: 0,
      totalDeductions,
      netPay,
      netPayThaiText,
      payslipEmailSent: false,
    };
  });

  const totalGrossIncome = records.reduce((sum, r) => sum + r.grossIncome, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
  const totalNetPay = records.reduce((sum, r) => sum + r.netPay, 0);

  const summary: MonthlyPayrollSummary = {
    periodMonth,
    periodName,
    dateGenerated: new Date().toISOString(),
    totalEmployees: records.length,
    totalGrossIncome,
    totalDeductions,
    totalNetPay,
    records,
    isLocked: false,
    exportedToGoogleSheets: false,
    backedUpToGoogleDrive: false,
  };

  savePayrollSummary(summary);
  broadcastEvent({ type: 'PAYROLL_GENERATED', payload: summary });
  return summary;
}

export function getPayrollSummaries(): Record<string, MonthlyPayrollSummary> {
  const saved = localStorage.getItem(STORAGE_KEYS.PAYROLL);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return {};
}

export function savePayrollSummary(summary: MonthlyPayrollSummary): void {
  const current = getPayrollSummaries();
  current[summary.periodMonth] = summary;
  localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(current));
  savePayrollSummaryToFirestore(summary);
}

export function markPayslipEmailSent(periodMonth: string, employeeId: string): void {
  const summaries = getPayrollSummaries();
  const summary = summaries[periodMonth];
  if (summary) {
    const record = summary.records.find(r => r.employeeId === employeeId);
    if (record) {
      record.payslipEmailSent = true;
      record.emailSentAt = new Date().toISOString();
      savePayrollSummary(summary);
    }
  }
}
