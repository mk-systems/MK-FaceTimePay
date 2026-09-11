import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  getDoc, 
  getDocFromServer,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Employee, AttendanceLog, CompanySettings, MonthlyPayrollSummary, LeaveRequest } from '../types';
import { initialCompanySettings, initialEmployees, generateSeedAttendanceLogs, initialLeaveRequests } from '../data/initialData';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if present in config
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

// Test connection on boot as mandated by Firebase guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: client is currently offline or warming up.");
    }
  }
}
testConnection();

// Collection references
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance_logs',
  SETTINGS: 'company_settings',
  PAYROLL: 'payroll_summaries',
  LEAVE_REQUESTS: 'leave_requests'
};

// Guard flags to prevent duplicate or looping seed operations
let isSeedingSettings = false;
let isSeedingEmployees = false;
let isSeedingAttendance = false;
let isSeedingLeave = false;

// --- Realtime Firestore Sync Helpers ---

// 1. Company Settings
export async function syncCompanySettingsFromFirestore(onUpdate: (settings: CompanySettings) => void) {
  const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'settings');

  return onSnapshot(settingsDocRef, async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as CompanySettings;
      onUpdate(data);
    } else if (!isSeedingSettings) {
      isSeedingSettings = true;
      try {
        await setDoc(settingsDocRef, initialCompanySettings);
      } catch (err) {
        console.warn('Firestore seed settings error:', err);
      }
      onUpdate(initialCompanySettings);
    }
  }, (error) => {
    console.warn('Firestore settings listener warning:', error);
  });
}

export async function saveCompanySettingsToFirestore(settings: CompanySettings) {
  try {
    const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, 'settings');
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (err) {
    console.warn('Error saving settings to Firestore:', err);
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
      emps.sort((a, b) => a.id.localeCompare(b.id));
      onUpdate(emps);
    } else if (!isSeedingEmployees) {
      isSeedingEmployees = true;
      try {
        const batch = writeBatch(db);
        initialEmployees.forEach((emp) => {
          const empRef = doc(db, COLLECTIONS.EMPLOYEES, emp.id);
          batch.set(empRef, emp);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore seed employees error:', err);
      }
      onUpdate(initialEmployees);
    }
  }, (error) => {
    console.warn('Firestore employees listener warning:', error);
  });
}

export async function saveEmployeeToFirestore(employee: Employee) {
  try {
    const empRef = doc(db, COLLECTIONS.EMPLOYEES, employee.id);
    await setDoc(empRef, employee, { merge: true });
  } catch (err) {
    console.warn('Error saving employee to Firestore:', err);
  }
}

export async function deleteEmployeeFromFirestore(employeeId: string) {
  try {
    const empRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
    await deleteDoc(empRef);
  } catch (err) {
    console.warn('Error deleting employee from Firestore:', err);
  }
}

export async function saveEmployeesBatchToFirestore(employees: Employee[]) {
  try {
    const batch = writeBatch(db);
    // Limit to safety bounds to avoid write queue exhaustion
    employees.slice(0, 50).forEach((emp) => {
      const empRef = doc(db, COLLECTIONS.EMPLOYEES, emp.id);
      batch.set(empRef, emp);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Error saving employees batch to Firestore:', err);
  }
}

// 3. Attendance Logs
export async function syncAttendanceLogsFromFirestore(onUpdate: (logs: AttendanceLog[]) => void) {
  const logsRef = collection(db, COLLECTIONS.ATTENDANCE);

  return onSnapshot(logsRef, async (snapshot) => {
    if (!snapshot.empty) {
      const logsMap = new Map<string, AttendanceLog>();
      snapshot.forEach((d) => {
        const data = d.data() as AttendanceLog;
        if (data && data.id) {
          logsMap.set(data.id, data);
        }
      });
      const logs = Array.from(logsMap.values());
      logs.sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(logs);
    } else if (!isSeedingAttendance) {
      isSeedingAttendance = true;
      try {
        const seedLogs = generateSeedAttendanceLogs(initialEmployees);
        // Only seed a concise, safe batch (max 20 records) to avoid stream queue exhaustion
        const safeBatchLogs = seedLogs.slice(0, 20);
        const batch = writeBatch(db);
        safeBatchLogs.forEach((log) => {
          const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
          batch.set(logRef, log);
        });
        await batch.commit();
        onUpdate(seedLogs);
      } catch (err) {
        console.warn('Firestore seed attendance error:', err);
        onUpdate(generateSeedAttendanceLogs(initialEmployees));
      }
    }
  }, (error) => {
    console.warn('Firestore attendance logs listener warning:', error);
  });
}

export async function saveAttendanceLogToFirestore(log: AttendanceLog) {
  try {
    const logRef = doc(db, COLLECTIONS.ATTENDANCE, log.id);
    await setDoc(logRef, log);
  } catch (err) {
    console.warn('Error saving attendance log to Firestore:', err);
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
    console.warn('Firestore payroll listener warning:', error);
  });
}

export async function savePayrollSummaryToFirestore(summary: MonthlyPayrollSummary) {
  try {
    const summaryRef = doc(db, COLLECTIONS.PAYROLL, summary.periodMonth);
    await setDoc(summaryRef, summary);
  } catch (err) {
    console.warn('Error saving payroll summary to Firestore:', err);
  }
}

// 5. Leave Requests
export async function syncLeaveRequestsFromFirestore(onUpdate: (requests: LeaveRequest[]) => void) {
  const leaveRef = collection(db, COLLECTIONS.LEAVE_REQUESTS);

  return onSnapshot(leaveRef, async (snapshot) => {
    if (!snapshot.empty) {
      const requests: LeaveRequest[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as LeaveRequest;
        if (data && data.id) {
          requests.push(data);
        }
      });
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(requests);
    } else if (!isSeedingLeave) {
      isSeedingLeave = true;
      try {
        const batch = writeBatch(db);
        initialLeaveRequests.forEach((req) => {
          const docRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, req.id);
          batch.set(docRef, req);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore seed leave error:', err);
      }
      onUpdate(initialLeaveRequests);
    }
  }, (error) => {
    console.warn('Firestore leave requests listener warning:', error);
  });
}

export async function saveLeaveRequestToFirestore(request: LeaveRequest) {
  try {
    const docRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, request.id);
    await setDoc(docRef, request, { merge: true });
  } catch (err) {
    console.warn('Error saving leave request to Firestore:', err);
  }
}

export async function deleteLeaveRequestFromFirestore(requestId: string) {
  try {
    const docRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting leave request from Firestore:', err);
  }
}

