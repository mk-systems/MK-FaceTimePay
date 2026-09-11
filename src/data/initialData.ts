import { Employee, AttendanceLog, CompanySettings, WorkLocation, LeaveRequest } from '../types';

export const initialWorkLocations: WorkLocation[] = [
  {
    id: 'LOC-01',
    name: 'สำนักงานใหญ่ (อาคารอินโนเวชั่น สุขุมวิท)',
    address: '888 อาคารอินโนเวชั่น ทาวเวอร์ ชั้น 18 ถ.สุขุมวิท คลองเตย กทม.',
    latitude: 13.736717,
    longitude: 100.561081,
    radiusMeters: 100,
    isActive: true,
    notes: 'สำนักงานใหญ่ ล็อครัศมี 100 เมตรจากจุดพิกัดจริง',
  },
  {
    id: 'LOC-02',
    name: 'สาขาพระราม 9 (G Tower)',
    address: '9 อาคาร จี ทาวเวอร์ แกรนด์ พระราม 9 ห้วยขวาง กทม.',
    latitude: 13.755482,
    longitude: 100.568412,
    radiusMeters: 100,
    isActive: true,
    notes: 'ศูนย์บริการลูกค้าและฝ่ายขาย สาขา 2 ล็อครัศมี 100 เมตร',
  },
  {
    id: 'LOC-03',
    name: 'คลังสินค้า & ศูนย์กระจายสินค้า (บางนา)',
    address: 'กม. 18 ถ.บางนา-ตราด ต.บางโฉลง อ.บางพลี จ.สมุทรปราการ',
    latitude: 13.626490,
    longitude: 100.702580,
    radiusMeters: 100,
    isActive: true,
    notes: 'คลังเก็บสินค้าและฝ่ายจัดส่ง Logistics ล็อครัศมี 100 เมตร',
  },
];

export const initialCompanySettings: CompanySettings = {
  companyName: 'บริษัท ดิจิทัล อินโนเวชั่น ซิสเต็มส์ จำกัด',
  companyNameEn: 'Digital Innovation Systems Co., Ltd.',
  taxId: '0105562089456',
  address: '888 อาคารอินโนเวชั่น ทาวเวอร์ ชั้น 18 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
  phoneNumber: '02-789-4560',
  email: 'hr-payroll@dis-thailand.com',
  website: 'www.dis-thailand.com',
  accountantName: 'น.ส. พิมพาภรณ์ บัญชีกิจ',
  accountantTitle: 'หัวหน้าฝ่ายการเงินและบัญชีองค์กร (CPA No. 89412)',
  registeredDriveFolder: 'Google Drive / DIS_HR_Backups / Monthly_Payroll_2026',
  registeredSheetName: 'DIS_Attendance_Payroll_Master',
  latePenaltyPerMinute: 2, // 2 บาท ต่อนาทีที่สาย
  enableSocialSecurity: true, // เปิด/ปิด การหักประกันสังคม
  socialSecurityRate: 5,     // 5%
  socialSecurityMaxBase: 15000,
  enableWithholdingTax: true,
  enableLogo: false,         // ค่าเริ่มต้นปิดโลโก้ (สำหรับบริษัทที่ไม่มีหรือไม่ต้องการใส่รูป)
  logoUrl: '',
  themeMode: 'auto',         // โหมดธีมการแสดงผลเริ่มต้นอัตโนมัติตามเวลา (18:00 - 06:00 น. = มืด, 06:00 - 18:00 น. = สว่าง)
  enableGpsVerification: true, // เปิดใช้งานระบบล็อคพิกัด GPS รัศมีไม่เกิน 100 เมตร
  officeLatitude: 13.736717,    // พิกัดออฟฟิศตัวอย่าง (สุขุมวิท กรุงเทพฯ)
  officeLongitude: 100.561081,
  maxAllowedRadiusMeters: 100,  // รัศมีล็อคไม่เกิน 100 เมตร
  workLocations: initialWorkLocations, // รายการสถานที่ปฏิบัติงาน / สาขา / ไซต์งาน (เพิ่ม/ลดได้ไม่จำกัด)
};

export const initialEmployees: Employee[] = [
  {
    id: 'EMP-1001',
    name: 'นายสมชาย สุขสมบูรณ์',
    nickname: 'ชาย',
    department: 'ฝ่ายพัฒนาระบบ (Software Eng.)',
    position: 'Senior Full Stack Developer',
    email: 'somchai.dev@dis-thailand.com',
    phone: '081-456-7890',
    idCard: '1-1004-99882-12-1',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    wageType: 'monthly',
    baseSalary: 38000,
    otRatePerHour: 237.5,
    shift: {
      startTime: '08:30',
      endTime: '17:30',
      graceMinutes: 15,
      workDaysPerWeek: 5,
    },
    allowances: {
      position: 3000,
      transport: 1500,
      meal: 1000,
      diligence: 1000,
      other: 0,
    },
    socialSecurity: true,
    withholdingTaxRate: 1,
    passcode: '1234',
    approvalStatus: 'approved',
    approvedBy: 'น.ส. พิมพาภรณ์ บัญชีกิจ (บัญชีองค์กร)',
    approvedAt: '2026-08-01T09:00:00.000Z',
    registeredAt: '2026-07-28T10:30:00.000Z',
    isActive: true,
  },
  {
    id: 'EMP-1002',
    name: 'นางสาวกานดา วิเศษสุข',
    nickname: 'แอน',
    department: 'ฝ่ายการตลาดดิจิทัล (Marketing)',
    position: 'Marketing Strategy Manager',
    email: 'kanda.mkt@dis-thailand.com',
    phone: '089-123-4567',
    idCard: '3-1020-00129-45-2',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    wageType: 'monthly',
    baseSalary: 42000,
    otRatePerHour: 262.5,
    shift: {
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      workDaysPerWeek: 5,
    },
    allowances: {
      position: 4000,
      transport: 2000,
      meal: 1200,
      diligence: 1000,
      other: 500,
    },
    socialSecurity: true,
    withholdingTaxRate: 1.5,
    passcode: '1234',
    approvalStatus: 'approved',
    approvedBy: 'น.ส. พิมพาภรณ์ บัญชีกิจ (บัญชีองค์กร)',
    approvedAt: '2026-08-01T09:15:00.000Z',
    registeredAt: '2026-07-29T14:20:00.000Z',
    isActive: true,
  },
  {
    id: 'EMP-1003',
    name: 'นายวันชัย เลิศมงคล',
    nickname: 'ชัย',
    department: 'ฝ่ายประสานงานคลังสินค้า (Logistics)',
    position: 'Inventory Operations Specialist',
    email: 'wanchai.ops@dis-thailand.com',
    phone: '092-888-9911',
    idCard: '1-1033-00452-91-8',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    wageType: 'monthly',
    baseSalary: 24000,
    otRatePerHour: 150,
    shift: {
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 10,
      workDaysPerWeek: 6,
    },
    allowances: {
      position: 0,
      transport: 1200,
      meal: 1500,
      diligence: 1000,
      other: 0,
    },
    socialSecurity: true,
    withholdingTaxRate: 0.5,
    passcode: '1234',
    // Note: Pending accountant approval!
    approvalStatus: 'pending_accountant',
    registeredAt: '2026-09-02T11:15:00.000Z',
    isActive: true,
  },
  {
    id: 'EMP-1004',
    name: 'นายมานะ ขยันยิ่ง',
    nickname: 'นะ',
    department: 'ฝ่ายบริการเทคนิคและซ่อมบำรุง',
    position: 'Facility Technician (ช่างเทคนิค)',
    email: 'mana.tech@dis-thailand.com',
    phone: '084-222-3344',
    idCard: '3-1005-00781-64-3',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    wageType: 'daily',
    baseSalary: 650, // 650 บาท/วัน
    otRatePerHour: 122,
    shift: {
      startTime: '08:30',
      endTime: '17:30',
      graceMinutes: 15,
      workDaysPerWeek: 6,
    },
    allowances: {
      position: 0,
      transport: 1000,
      meal: 1000,
      diligence: 1200,
      other: 0,
    },
    socialSecurity: true,
    withholdingTaxRate: 0,
    passcode: '1234',
    approvalStatus: 'approved',
    approvedBy: 'น.ส. พิมพาภรณ์ บัญชีกิจ (บัญชีองค์กร)',
    approvedAt: '2026-08-05T13:40:00.000Z',
    registeredAt: '2026-08-02T16:00:00.000Z',
    isActive: true,
  },
];

// Helper to generate attendance logs for the current month
export function generateSeedAttendanceLogs(employees: Employee[]): AttendanceLog[] {
  const logs: AttendanceLog[] = [];
  const approvedEmployees = employees.filter(e => e.approvalStatus === 'approved');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // current month
  const todayDate = now.getDate();

  // Create attendance records for days 1 through today
  for (let day = 1; day <= todayDate; day++) {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) continue; // skip Sunday

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    approvedEmployees.forEach((emp) => {
      // Check in
      const [shiftH, shiftM] = emp.shift.startTime.split(':').map(Number);
      
      // Introduce slight variations (some days on time, some days 10-25 mins late, some days early)
      let inH = shiftH;
      let inM = shiftM;
      let isLate = false;
      let lateMinutes = 0;

      // Make day 3 & 7 slightly late for testing calculation
      if ((day === 3 || day === 7) && emp.id === 'EMP-1001') {
        inM = shiftM + 25; // 25 mins late (past 15m grace)
        if (inM >= 60) {
          inH += 1;
          inM -= 60;
        }
        isLate = true;
        lateMinutes = 25;
      } else if (day === 5 && emp.id === 'EMP-1002') {
        inM = shiftM + 20;
        if (inM >= 60) {
          inH += 1;
          inM -= 60;
        }
        isLate = true;
        lateMinutes = 20;
      } else {
        // Arrived 5-10 mins early or on time
        inM = Math.max(0, shiftM - (day % 4) * 3);
      }

      const timeInStr = `${String(inH).padStart(2, '0')}:${String(inM).padStart(2, '0')}:15`;
      const inTimestamp = new Date(`${dateStr}T${timeInStr}`).getTime();

      logs.push({
        id: `LOG-IN-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: dateStr,
        time: timeInStr,
        timestamp: inTimestamp,
        type: 'check_in',
        status: isLate ? 'late' : 'on_time',
        lateMinutes: lateMinutes,
        otMinutes: 0,
        faceConfidence: 98.2 + (day % 3) * 0.5,
        capturedPhoto: emp.photoUrl,
        verified: true,
        notes: isLate ? `มาสายกว่าเวลากะ ${lateMinutes} นาที` : 'สแกนใบหน้าสำเร็จตรงเวลา',
      });

      // Check out (only if day < todayDate, or if afternoon today)
      const [shiftEndH, shiftEndM] = emp.shift.endTime.split(':').map(Number);
      let outH = shiftEndH;
      let outM = shiftEndM;
      let otMinutes = 0;

      // Add OT for some days (e.g. 1.5 - 2 hrs OT)
      if ((day === 2 || day === 6 || day === 8) && emp.id === 'EMP-1001') {
        outH += 2; // 2 hours OT
        otMinutes = 120;
      } else if ((day === 4 || day === 7) && emp.id === 'EMP-1004') {
        outH += 1;
        outM += 30; // 1.5 hrs OT
        otMinutes = 90;
      }

      const timeOutStr = `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}:40`;
      const outTimestamp = new Date(`${dateStr}T${timeOutStr}`).getTime();

      // Don't add checkout for today if it's currently early morning
      if (day < todayDate || now.getHours() >= 17) {
        logs.push({
          id: `LOG-OUT-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          date: dateStr,
          time: timeOutStr,
          timestamp: outTimestamp,
          type: 'check_out',
          status: otMinutes > 0 ? 'overtime' : 'on_time',
          lateMinutes: 0,
          otMinutes: otMinutes,
          faceConfidence: 97.9 + (day % 4) * 0.4,
          capturedPhoto: emp.photoUrl,
          verified: true,
          notes: otMinutes > 0 ? `ทำโอทีล่วงเวลา ${otMinutes / 60} ชม.` : 'สแกนออกงานปกติ',
        });
      }
    });
  }

  return logs;
}

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'LEAVE-REQ-001',
    employeeId: 'EMP-1002',
    employeeName: 'น.ส. วิภาดา เจริญสุข',
    department: 'ฝ่ายบัญชีและการเงิน',
    leaveType: 'annual_leave',
    leaveTypeName: 'ลาพักร้อน (Annual Leave)',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    daysCount: 2,
    reason: 'ขอลาพักร้อนประจำปีเพื่อเดินทางไปทำธุระครอบครัวต่างจังหวัด',
    status: 'pending',
    createdAt: '2026-09-08T09:30:00.000Z',
  },
  {
    id: 'LEAVE-REQ-002',
    employeeId: 'EMP-1003',
    employeeName: 'นายณัฐพล ศรีวิชัย',
    department: 'ฝ่ายการตลาดและการขาย',
    leaveType: 'sick_leave',
    leaveTypeName: 'ลาป่วย (Sick Leave)',
    startDate: '2026-09-05',
    endDate: '2026-09-05',
    daysCount: 1,
    reason: 'มีอาการไข้หวัด ปวดศีรษะ พบแพทย์และพักผ่อนตามคำสั่งแพทย์',
    status: 'approved',
    createdAt: '2026-09-05T07:15:00.000Z',
    reviewedBy: 'แอดมินฝ่ายบุคคล (HR Admin)',
    reviewedAt: '2026-09-05T08:00:00.000Z',
    reviewNotes: 'อนุมัติการลาป่วย พักผ่อนให้หายไวๆ ครับ',
  },
  {
    id: 'LEAVE-REQ-003',
    employeeId: 'EMP-1001',
    employeeName: 'นายสมชาย สุขสมบูรณ์',
    department: 'ฝ่ายพัฒนาระบบ (Software Eng.)',
    leaveType: 'holiday_swap',
    leaveTypeName: 'ขอหยุด / สลับวันหยุด (Day Off)',
    startDate: '2026-09-22',
    endDate: '2026-09-22',
    daysCount: 1,
    reason: 'ขอหยุดชดเชยเนื่องจากมาปฏิบัติงานดูแลเซิร์ฟเวอร์ในวันเสาร์',
    status: 'pending',
    createdAt: '2026-09-09T14:20:00.000Z',
  }
];

