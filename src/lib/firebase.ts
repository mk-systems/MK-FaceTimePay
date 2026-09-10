import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Employee, AttendanceLog, CompanySettings, MonthlyPayrollSummary } from '../types';
import { initialCompanySettings, initialEmployees, generateSeedAttendanceLogs } from '../data/initialData';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if present in config
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

// Collection references
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance_logs',
  SETTINGS: 'company_settings',
  PAYROLL: 'payroll_summaries'
};

// --- Realtime Firestore Sync Helpers ---

// 1. Company Settings
export async function syncCompanySettingsFromFirestore(onUpdate: (settings: CompanySettings) => void) {
  const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'settings');

  // Realtime listener
  return onSnapshot(settingsDocRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as CompanySettings;
      onUpdate(data);
    } else {
      // Seed initial settings to Firestore
      setDoc(settingsDocRef, initialCompanySettings).catch(console.error);
      onUpdate(initialCompanySettings);
    }
  }, (error) => {
    console.warn('Firestore settings listener error:', error);
  });
}

export async function saveCompanySettingsToFirestore(settings: CompanySettings) {
  try {
    const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'settings');
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
  }
}

// 2. Employees
export async function syncEmployeesFromFirestore(onUpdate: (employees: Employee[]) => void) {
  const empCollectionRef = collection(db, COLLECTIONS.EMPLOYEES);

  return onSnapshot(empCollectionRef, async (snapshot) => {
    if (!snapshot.empty) {
      const emps: Employee[] = [];
      snapshot.forEach((d) => {
        emps.push(d.data() as Employee);
      });
      // Sort by employee ID or name
      emps.sort((a, b) => a.id.localeCompare(b.id));
      onUpdate(emps);
    } else {
      // Seed initial employees to Firestore
      const batch = writeBatch(db);
      initialEmployees.forEach((emp) => {
        const empRef = doc(db, COLLECTIONS.EMPLOYEES, emp.id);
        batch.set(empRef, emp);
      });
      await batch.commit().catch(console.error);
      onUpdate(initialEmployees);
    }
  }, (error) => {
    console.warn('Firestore employees listener error:', error);
  });
}

export async function saveEmployeeToFirestore(employee: Employee) {
  try {
    const empRef = doc(db, COLLECTIONS.EMPLOYEES, employee.id);
    await setDoc(empRef, employee, { merge: true });
  } catch (err) {
    console.error('Error saving employee to Firestore:', err);
  }
}

export async function saveEmployeesBatchToFirestore(employees: Employee[]) {
  try {
    const batch = writeBatch(db);
    employees.forEach((emp) => {
      const empRef = doc(db, COLLECTIONS.EMPLOYEES, emp.id);
      batch.set(empRef, emp);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error saving employees batch to Firestore:', err);
  }
}

// 3. Attendance Logs
export async function syncAttendanceLogsFromFirestore(onUpdate: (logs: AttendanceLog[]) => void) {
  const logsRef = collection(db, COLLECTIONS.ATTENDANCE);

  return onSnapshot(logsRef, async (snapshot) => {
    if (!snapshot.empty) {
      const logs: AttendanceLog[] = [];
      snapshot.forEach((d) => {
        logs.push(d.data() as AttendanceLog);
      });
      // Sort newest first by timestamp or date + time
      logs.sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(logs);
    } else {
      // Seed initial logs to Firestore
      const seedLogs = generateSeedAttendanceLogs(initialEmployees);
      const batch = writeBatch(db);
      // Batch supports up to 500 writes
      seedLogs.slice(0, 450).forEach((log) => {
        const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
        batch.set(logRef, log);
      });
      await batch.commit().catch(console.error);
      onUpdate(seedLogs);
    }
  }, (error) => {
    console.warn('Firestore attendance logs listener error:', error);
  });
}

export async function saveAttendanceLogToFirestore(log: AttendanceLog) {
  try {
    const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
    await setDoc(logRef, log);
  } catch (err) {
    console.error('Error saving attendance log to Firestore:', err);
  }
}

// 4. Payroll Summaries
export async function syncPayrollFromFirestore(onUpdate: (summaries: Record<string, MonthlyPayrollSummary>) => void) {
  const payrollRef = collection(db, COLLECTIONS.PAYROLL);

  return onSnapshot(payrollRef, (snapshot) => {
    const dict: Record<string, MonthlyPayrollSummary> = {};
    snapshot.forEach((d) => {
      const summary = d.data() as MonthlyPayrollSummary;
      dict[summary.periodMonth] = summary;
    });
    onUpdate(dict);
  }, (error) => {
    console.warn('Firestore payroll listener error:', error);
  });
}

export async function savePayrollSummaryToFirestore(summary: MonthlyPayrollSummary) {
  try {
    const summaryRef = doc(db, COLLECTIONS.PAYROLL, summary.periodMonth);
    await setDoc(summaryRef, summary);
  } catch (err) {
    console.error('Error saving payroll summary to Firestore:', err);
  }
}
