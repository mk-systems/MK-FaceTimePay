export type WageType = 'monthly' | 'daily' | 'hourly';
export type ApprovalStatus = 'pending_accountant' | 'approved' | 'rejected';
export type AttendanceType = 'check_in' | 'check_out';
export type AttendanceStatus = 'on_time' | 'late' | 'early_leave' | 'overtime';

export interface ShiftConfig {
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "17:30"
  graceMinutes: number; // e.g. 15
  workDaysPerWeek: number; // e.g. 5
}

export interface EmployeeAllowances {
  position: number;    // ค่าตำแหน่ง
  transport: number;   // ค่าเดินทาง
  meal: number;        // ค่าอาหาร/เบี้ยเลี้ยง
  diligence: number;   // เบี้ยขยัน
  other: number;       // เงินเพิ่มพิเศษอื่นๆ
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface BiometricFacialFeatures {
  eyeDistanceRatio: number;      // อัตราส่วนระยะห่างระหว่างดวงตา (Inter-pupillary Distance Ratio)
  eyeToNoseRatio: number;        // สัดส่วนดวงตาถึงสันจมูก (Eye-to-Nose Proportion)
  noseToMouthRatio: number;      // สัดส่วนจมูกถึงปาก (Nose-to-Mouth Proportion)
  faceAspectRatio: number;       // อัตราส่วนความกว้างต่อความยาวใบหน้า (Face Aspect Ratio)
  jawlineContour: string;        // รูปทรงใบหน้า (เช่น 'Oval (รูปไข่)', 'Square (เหลี่ยม)', 'Round (กลม)')
  skinLuminance: number;         // ระดับแสงเฉลี่ยบนใบหน้า (Luminance Profile 0-255)
  livenessScore: number;         // คะแนนการตรวจสอบคนจริง (Liveness Score 0-100%)
}

export interface BiometricProfile {
  enrolledAt: string;            // วันเวลาที่สกัดและบันทึกอัตลักษณ์ชีวมิติ
  enrolledBy?: string;           // ผู้บันทึกหรืออนุมัติ (เช่น 'HR/Admin' หรือ 'ลงทะเบียนตนเอง')
  isLocked: boolean;             // สถานะล็อคอัตลักษณ์ ป้องกันการสลับรูปเพื่อสแกนแทนกัน
  qualityScore: number;          // คะแนนคุณภาพข้อมูลชีวมิติ (0-100%)
  clarityScore: number;          // ความคมชัดของภาพชีวมิติ (0-100%)
  vector: number[];              // เวกเตอร์ชีวมิติ 64 มิติ (Biometric Embedding ใน RAM)
  features: BiometricFacialFeatures; // รายละเอียดคุณลักษณะเรขาคณิตใบหน้า
  deviceModel?: string;          // อุปกรณ์ที่ใช้ลงทะเบียน
  descriptorHash?: string;       // แฮชชีวมิติเข้ารหัส SHA-256 ปลอดภัยตาม PDPA/GDPR
  encryptedDescriptor?: string;  // ซองข้อมูลชีวมิติเข้ารหัส AES-GCM-256
  secureBioHash?: string;        // Locality-Sensitive BioHash สำหรับการเปรียบเทียบเชิงเรขาคณิต
  isRawImageStripped?: boolean;  // ลบข้อมูลภาพดิบออกจากระบบจัดเก็บเพื่อคุ้มครองข้อมูลส่วนบุคคล
  encryptionAlgorithm?: string;  // อัลกอริทึมการเข้ารหัส เช่น 'AES-GCM-256+SHA-256'
}

export interface Employee {
  id: string;             // e.g. "EMP-001"
  name: string;           // e.g. "นายสมชาย มุ่งมั่น"
  nickname: string;       // e.g. "ชาย"
  department: string;     // e.g. "ฝ่ายพัฒนาธุรกิจ"
  position: string;       // e.g. "Senior Specialist"
  email: string;          // e.g. "somchai@company.co.th"
  phone: string;
  idCard: string;         // เลขประจำตัวประชาชน 13 หลัก
  photoUrl: string;       // ภาพถ่ายอวาตาร์ หรือ URL (ภาพดิบถูกเปลี่ยนเป็น Privacy Token ป้องกันข้อมูลส่วนบุคคล)
  faceDescriptor?: number[]; // Biometric embedding vector (in-memory)
  faceDescriptorHash?: string; // แฮชเข้ารหัสของข้อมูลใบหน้า (SHA-256 Biometric Hash)
  encryptedFaceDescriptor?: string; // เวกเตอร์ใบหน้าที่เข้ารหัส AES-GCM สำหรับจัดเก็บถาวร
  biometricProfile?: BiometricProfile; // ข้อมูลคุณลักษณะอัตลักษณ์ชีวมิติ
  privacyMode?: boolean;  // โหมดความเป็นส่วนตัวสูง: เข้ารหัสชีวมิติและไม่จัดเก็บภาพดิบ
  wageType: WageType;     // รายเดือน, รายวัน, รายชั่วโมง
  baseSalary: number;     // อัตราจ้างพื้นฐาน (บาท)
  otRatePerHour: number;  // อัตราค่าล่วงเวลาต่อชั่วโมง
  shift: ShiftConfig;     // กะเวลาเข้า-ออกงานเฉพาะบุคคล
  allowances: EmployeeAllowances;
  socialSecurity: boolean; // สมทบประกันสังคม 5% หรือไม่
  withholdingTaxRate: number; // ภาษีหัก ณ ที่จ่าย (%) เช่น 0, 1, 3
  passcode?: string;      // รหัสผ่านสำหรับพนักงานเข้าใช้งานแอปที่เจ้าหน้าที่ออกให้
  allowedLocationIds?: string[]; // รายการ id สถานที่ที่อนุญาตให้ลงเวลาได้ (ถ้าว่าง หรือ ['all'] คือทุกสถานที่)
  allowOffsiteCheckin?: boolean; // อนุญาตให้ลงเวลานอกสถานที่ได้ ไม่จำกัดพิกัด GPS (เช่น เซลส์, ช่างบริการ, WFH)
  approvalStatus: ApprovalStatus; // ต้องผ่านการอนุมัติจากบัญชีก่อน
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  registeredAt: string;
  isActive: boolean;
}

export type UserRole = 'employee' | 'staff';

export interface AuthSession {
  role: UserRole;
  employeeId?: string; // ถ้าเป็น role === 'employee'
  staffName?: string;  // ถ้าเป็น role === 'staff'
  staffRole?: 'accountant' | 'admin';
  loginAt: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm:ss
  timestamp: number;     // epoch ms
  type: AttendanceType;  // 'check_in' | 'check_out'
  status: AttendanceStatus;
  lateMinutes: number;
  otMinutes: number;
  faceConfidence: number; // e.g. 98.7%
  capturedPhoto: string;  // snapshot taken during face scan
  verified: boolean;
  locationName?: string;  // ชื่อสถานที่หรือสาขาที่สแกนสำเร็จ เช่น "สำนักงานใหญ่ (สุขุมวิท)" หรือ "นอกสถานที่ (Off-site)"
  latitude?: number;      // ละติจูดขณะสแกน
  longitude?: number;     // ลองจิจูดขณะสแกน
  distanceMeters?: number;// ระยะห่างจากจุดศูนย์กลางสถานที่ (เมตร)
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  nickname: string;
  department: string;
  position: string;
  email: string;
  bankAccount: BankAccount;
  periodMonth: string;    // e.g. "2026-09"
  periodName: string;     // e.g. "กันยายน 2569"
  wageType: WageType;
  baseSalary: number;
  
  // เวลาและการทำงาน
  scheduledDays: number;
  actualWorkDays: number;
  totalLateMinutes: number;
  lateDeduction: number;
  totalOtHours: number;
  otPay: number;

  // รายได้
  earnedBasePay: number;
  allowances: EmployeeAllowances;
  totalAllowances: number;
  grossIncome: number;

  // รายการหัก
  socialSecurity: number; // ปกส. 5% ไม่เกิน 750
  withholdingTax: number; // ภาษีหัก ณ ที่จ่าย
  otherDeductions: number;
  totalDeductions: number;

  // สุทธิ
  netPay: number;
  netPayThaiText: string;

  // สถานะ
  payslipEmailSent: boolean;
  emailSentAt?: string;
}

export interface MonthlyPayrollSummary {
  periodMonth: string; // "2026-09"
  periodName: string;  // "กันยายน 2569"
  dateGenerated: string;
  totalEmployees: number;
  totalGrossIncome: number;
  totalDeductions: number;
  totalNetPay: number;
  records: PayrollRecord[];
  isLocked: boolean;
  exportedToGoogleSheets: boolean;
  backedUpToGoogleDrive: boolean;
  lastDriveBackupAt?: string;
}

export type ThemeMode = 'auto' | 'light' | 'dark' | 'system';

export type LeaveType = 
  | 'sick_leave'       // ลาป่วย
  | 'annual_leave'     // ลาพักร้อน
  | 'personal_leave'   // ลากิจ
  | 'holiday_swap'     // ขอหยุด / สลับวันหยุด
  | 'unpaid_leave'     // ลาไม่รับค่าจ้าง
  | 'other';           // อื่นๆ

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;               // e.g. "LEAVE-1725900000000"
  employeeId: string;       // e.g. "EMP-1001"
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  leaveTypeName: string;    // e.g. "ลาป่วย (Sick Leave)"
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  daysCount: number;        // e.g. 1 หรือ 0.5 หรือ 3
  reason: string;           // เหตุผลการลา
  attachmentUrl?: string;   // เอกสารแนบ เช่น ใบรับรองแพทย์ (Base64 หรือ URL)
  status: LeaveStatus;      // 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string;        // ISO string
  reviewedBy?: string;      // ชื่อแอดมินหรือหัวหน้างานที่อนุมัติ/ปฏิเสธ
  reviewedAt?: string;      // วันเวลาที่อนุมัติ
  reviewNotes?: string;     // ข้อความหรือหมายเหตุจากผู้อนุมัติ
}

export interface WorkLocation {
  id: string;
  name: string;             // เช่น "สำนักงานใหญ่ (สุขุมวิท)", "สาขาพระราม 9", "ไซต์งานบางนา"
  address?: string;         // ที่อยู่หรือรายละเอียดสังเขป
  latitude: number;         // ละติจูด
  longitude: number;        // ลองจิจูด
  radiusMeters: number;     // รัศมีที่อนุญาต (เมตร) เช่น 200 เมตร
  isActive: boolean;        // เปิด/ปิด การใช้งานสถานที่นี้
  notes?: string;           // หมายเหตุเพิ่มเติม
}

export interface CompanySettings {
  companyName: string;
  companyNameEn: string;
  taxId: string;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  accountantName: string;
  accountantTitle: string;
  registeredDriveFolder: string;
  registeredSheetName: string;
  latePenaltyPerMinute: number; // บาทต่อนาทีที่สาย (0 = คำนวณตามฐานเงินเดือน)
  enableSocialSecurity: boolean; // เปิด/ปิด การหักประกันสังคม (กรณีไม่มีประกันสังคมให้พนักงาน)
  socialSecurityRate: number;    // เปอร์เซ็นต์ ปกส. (ค่าเริ่มต้น 5)
  socialSecurityMaxBase: number; // เพดานเงินเดือน ปกส. (ค่าเริ่มต้น 15000)
  enableWithholdingTax: boolean; // เปิด/ปิด หักภาษี ณ ที่จ่าย
  enableLogo: boolean;           // เปิด/ปิด การแสดงโลโก้บริษัทบนเอกสาร (กรณีไม่มีให้ปิดได้)
  logoUrl?: string;              // รูปภาพโลโก้ Base64 หรือ URL
  themeMode?: ThemeMode;         // โหมดธีมการแสดงผล: 'auto' (ตามเวลา 18:00-06:00), 'light' (สว่าง), 'dark' (มืด), 'system' (ตามอุปกรณ์)
  enableGpsVerification?: boolean; // ตรวจสอบตำแหน่ง GPS เมื่อสแกนผ่านมือถือพนักงาน
  officeLatitude?: number;         // ละติจูดของออฟฟิศ (fallback)
  officeLongitude?: number;        // ลองจิจูดของออฟฟิศ (fallback)
  maxAllowedRadiusMeters?: number; // รัศมีที่อนุญาต (เมตร) เช่น 150 เมตร
  workLocations?: WorkLocation[];  // รายการสถานที่ปฏิบัติงาน / สาขา / ไซต์งาน ทั้งหมด (เพิ่ม/ลด ได้ไม่จำกัด)
}

