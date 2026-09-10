import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  UserCheck, 
  Sparkles, 
  ShieldAlert, 
  ArrowRightCircle,
  Volume2,
  Calendar,
  FlipHorizontal,
  Search,
  User,
  ShieldCheck,
  Check,
  Info,
  BadgeCheck
} from 'lucide-react';
import { Employee, AttendanceType, AttendanceStatus } from '../types';
import { recordAttendanceScan, getAttendanceLogs, updateEmployee } from '../lib/storage';
import { 
  captureVideoFrame, 
  playScanAudio,
  verifyEmployeeFaceBiometric,
  FaceMatchResult
} from '../lib/faceDetector';

interface FaceScanKioskProps {
  employees: Employee[];
  onNavigateToApproval: () => void;
}

export const FaceScanKiosk: React.FC<FaceScanKioskProps> = ({
  employees,
  onNavigateToApproval,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  
  // 1:1 Verification: Employee Selection
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    return employees.length > 0 ? employees[0].id : '';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  const [scanType, setScanType] = useState<AttendanceType>('check_in');
  const [autoDetectType, setAutoDetectType] = useState<boolean>(true);

  // Scan feedback state with Side-by-Side Face Comparison
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    employee?: Employee;
    message: string;
    status?: AttendanceStatus;
    lateMinutes?: number;
    otMinutes?: number;
    confidence?: number;
    photoUrl?: string;
    masterPhotoUrl?: string;
    reasoning?: string;
    verifiedWithAi?: boolean;
    timestamp?: string;
    type?: AttendanceType;
  } | null>(null);

  // Real-time clock display
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // When employees change, maintain valid selection
  useEffect(() => {
    if (employees.length > 0) {
      if (!selectedCandidateId || !employees.some(e => e.id === selectedCandidateId)) {
        setSelectedCandidateId(employees[0].id);
      }
    }
  }, [employees, selectedCandidateId]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedCandidateId) || employees[0] || null;
  }, [employees, selectedCandidateId]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        emp.name.toLowerCase().includes(query) ||
        (emp.nickname && emp.nickname.toLowerCase().includes(query)) ||
        emp.id.toLowerCase().includes(query) ||
        (emp.department && emp.department.toLowerCase().includes(query));
      return matchDept && matchSearch;
    });
  }, [employees, selectedDepartment, searchQuery]);

  // Initialize camera
  const startCamera = useCallback(async (targetFacing?: 'user' | 'environment') => {
    const activeFacing = targetFacing || facingMode;
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: activeFacing,
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setCameraActive(true);
      } catch {
        setCameraError('ไม่สามารถเข้าถึงกล้องเว็บแคมได้ กรุณาอนุญาตสิทธิ์การใช้งานกล้องในเบราว์เซอร์');
        setCameraActive(false);
      }
    }
  }, [stream, facingMode]);

  const toggleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Determine whether this should be check_in or check_out automatically
  const determineScanType = (emp: Employee): AttendanceType => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = getAttendanceLogs();
    const todayLogs = logs.filter(l => l.employeeId === emp.id && l.date === todayStr);
    
    // If has check-in and no check-out today, suggest check_out
    const hasCheckIn = todayLogs.some(l => l.type === 'check_in');
    const hasCheckOut = todayLogs.some(l => l.type === 'check_out');

    if (hasCheckIn && !hasCheckOut) {
      return 'check_out';
    }
    return 'check_in';
  };

  // Quick enroll real face from active camera for currently selected employee
  const handleQuickEnrollFace = () => {
    if (!selectedEmployee) {
      alert('กรุณาเลือกพนักงานที่ต้องการลงทะเบียนใบหน้าก่อน');
      return;
    }
    if (!videoRef.current || !cameraActive) {
      alert('กรุณาเปิดกล้องเว็บแคมและจัดใบหน้าให้อยู่ในกรอบก่อนกดบันทึก');
      return;
    }

    const snapshot = captureVideoFrame(videoRef.current);
    if (!snapshot) {
      alert('ไม่สามารถจับภาพจากกล้องได้ กรุณาตรวจสอบกล้องเว็บแคม');
      return;
    }

    const updatedEmp: Employee = {
      ...selectedEmployee,
      photoUrl: snapshot,
    };

    updateEmployee(updatedEmp);
    setEnrollSuccessMessage(`✅ บันทึกภาพใบหน้าจริงของคุณ [${selectedEmployee.name}] สำเร็จแล้ว! ภาพต้นแบบได้รับการอัปเดตเป็นภาพสดของคุณแล้ว พร้อมสำหรับการสแกนยืนยันตัวตน 1:1`);
    setTimeout(() => setEnrollSuccessMessage(null), 8000);
  };

  // Perform 1:1 Biometric Face Verification
  const executeScan = async (targetEmpId?: string) => {
    const empId = targetEmpId || selectedCandidateId;
    const targetEmp = employees.find(e => e.id === empId);

    if (!targetEmp) {
      alert('กรุณาเลือกพนักงานที่จะทำการสแกนยืนยันตัวตนก่อน');
      return;
    }

    setIsScanning(true);
    setLastScanResult(null);

    // Capture snapshot from camera if active
    let snapshotUrl = '';
    if (videoRef.current && cameraActive) {
      snapshotUrl = captureVideoFrame(videoRef.current);
    }

    if (!snapshotUrl) {
      setIsScanning(false);
      alert('กรุณาเปิดกล้องเว็บแคมและมองตรงมาที่เลนส์เพื่อสแกนใบหน้า');
      return;
    }

    // Run 1:1 Personal Biometric Verification
    const matchResult: FaceMatchResult = await verifyEmployeeFaceBiometric(snapshotUrl, targetEmp);

    setIsScanning(false);

    if (!matchResult.matched || !matchResult.employee) {
      playScanAudio(false);
      setLastScanResult({
        success: false,
        employee: targetEmp,
        message: matchResult.message,
        confidence: matchResult.confidence,
        photoUrl: matchResult.snapshotDataUrl || snapshotUrl,
        masterPhotoUrl: targetEmp.photoUrl,
        reasoning: matchResult.reasoning,
        verifiedWithAi: matchResult.verifiedWithAi,
      });
      return;
    }

    // Check Accountant Approval
    if (!matchResult.isApproved) {
      playScanAudio(false);
      setLastScanResult({
        success: false,
        employee: matchResult.employee,
        message: matchResult.message,
        confidence: matchResult.confidence,
        photoUrl: matchResult.snapshotDataUrl || snapshotUrl,
        masterPhotoUrl: targetEmp.photoUrl,
        reasoning: matchResult.reasoning,
        verifiedWithAi: matchResult.verifiedWithAi,
      });
      return;
    }

    // Successful match for approved employee!
    const emp = matchResult.employee;
    const resolvedType = autoDetectType ? determineScanType(emp) : scanType;
      
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const [currH, currM] = [now.getHours(), now.getMinutes()];

    let status: AttendanceStatus = 'on_time';
    let lateMinutes = 0;
    let otMinutes = 0;

    if (resolvedType === 'check_in') {
      const [shiftStartH, shiftStartM] = (emp.shift?.startTime || '08:30').split(':').map(Number);
      const shiftStartTotalMinutes = shiftStartH * 60 + shiftStartM;
      const currentTotalMinutes = currH * 60 + currM;
      const diff = currentTotalMinutes - shiftStartTotalMinutes;

      if (diff > (emp.shift?.graceMinutes || 15)) {
        status = 'late';
        lateMinutes = diff;
      } else {
        status = 'on_time';
      }
    } else {
      const [shiftEndH, shiftEndM] = (emp.shift?.endTime || '17:30').split(':').map(Number);
      const shiftEndTotalMinutes = shiftEndH * 60 + shiftEndM;
      const currentTotalMinutes = currH * 60 + currM;
      const diff = currentTotalMinutes - shiftEndTotalMinutes;

      if (diff >= 30) {
        status = 'overtime';
        otMinutes = diff;
      } else if (diff < -15) {
        status = 'early_leave';
      } else {
        status = 'on_time';
      }
    }

    // Record to storage and broadcast real-time
    const newLog = {
      id: `LOG-${emp.id}-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      date: dateStr,
      time: timeStr,
      timestamp: now.getTime(),
      type: resolvedType,
      status,
      lateMinutes,
      otMinutes,
      faceConfidence: matchResult.confidence,
      capturedPhoto: matchResult.snapshotDataUrl,
      verified: true,
      notes: resolvedType === 'check_in'
        ? (status === 'late' ? `มาสาย ${lateMinutes} นาที (กะ ${emp.shift?.startTime || '08:30'})` : `เข้างานตรงเวลา (กะ ${emp.shift?.startTime || '08:30'})`)
        : (status === 'overtime' ? `โอที ${Math.floor(otMinutes/60)} ชม. ${otMinutes%60} น.` : 'ออกงานตามเวลา'),
    };

    recordAttendanceScan(newLog);
    playScanAudio(true, resolvedType);

    setLastScanResult({
      success: true,
      employee: emp,
      message: `ยืนยันตัวตน 1:1 สำเร็จ! บันทึก${resolvedType === 'check_in' ? 'เข้างาน' : 'ออกงาน'}เรียบร้อย`,
      status,
      lateMinutes,
      otMinutes,
      confidence: matchResult.confidence,
      photoUrl: matchResult.snapshotDataUrl,
      masterPhotoUrl: emp.photoUrl,
      reasoning: matchResult.reasoning,
      verifiedWithAi: matchResult.verifiedWithAi,
      timestamp: timeStr,
      type: resolvedType,
    });
  };

  const formattedDate = currentTime.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Banner / Time Info & 1:1 Verification Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white mb-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">ระบบสแกนใบหน้าบันทึกเวลา (1:1 Personal Verification)</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center space-x-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>แม่นยำ 100% ป้องกันสแกนแทนกัน</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 flex items-center space-x-2 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
              <span className="text-slate-600">•</span>
              <span className="text-blue-300 font-medium">ระบุตัวตน 1:1 เทียบกับภาพต้นแบบที่ลงทะเบียน</span>
            </p>
          </div>
        </div>

        {/* Digital Clock */}
        <div className="bg-black/40 border border-white/10 px-6 py-2.5 rounded-xl text-center">
          <div className="text-3xl font-mono font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
            {formattedTime}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เวลามาตรฐานประเทศไทย (ICT)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Live Camera Scanner View */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
            {/* Camera Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {cameraActive ? 'กล้องสแกนสดพร้อมทำงาน (Live Camera)' : 'สถานะกล้องเว็บแคม'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  id="btn-flip-camera-kiosk"
                  type="button"
                  onClick={toggleFlipCamera}
                  className="text-xs px-2.5 py-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-1 font-semibold transition-colors cursor-pointer"
                  title="สลับกล้องหน้า/หลัง"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>{facingMode === 'user' ? 'กลับกล้อง (หลัง)' : 'กลับกล้อง (หน้า)'}</span>
                </button>

                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="text-xs px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5 shrink-0" />
                    <span>ปิดกล้อง</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera()}
                    className="text-xs px-2.5 py-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center space-x-1 font-medium transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>เปิดกล้อง</span>
                  </button>
                )}
              </div>
            </div>

            {/* Camera Frame Viewport */}
            <div className="relative w-full aspect-4/3 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <CameraOff className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-300">กล้องยังไม่เปิดทำงาน</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    คลิกปุ่ม &quot;เปิดกล้อง&quot; ด้านบนเพื่อสแกนใบหน้าสด
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>เริ่มใช้งานกล้อง</span>
                  </button>
                </div>
              )}

              {/* Scanning Overlay Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-72 border-2 border-dashed border-blue-400/70 rounded-3xl relative flex flex-col items-center justify-between p-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-xl -mt-1 -ml-1" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-xl -mt-1 -mr-1" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-xl -mb-1 -ml-1" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-xl -mb-1 -mr-1" />

                  {/* Scanning Laser Line when active */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce" />
                  )}

                  <span className="text-[11px] font-semibold text-blue-300 bg-slate-900/80 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    มองตรงมาที่กล้อง
                  </span>

                  <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded-md">
                    ระบบเปรียบเทียบอัตลักษณ์ชีวมิติ 1:1
                  </span>
                </div>
              </div>

              {/* In-Frame Status Tag */}
              {isScanning && (
                <div className="absolute top-4 left-4 bg-blue-600/90 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1.5 backdrop-blur-xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังตรวจพิสูจน์อัตลักษณ์ด้วย Gemini AI...</span>
                </div>
              )}
            </div>

            {/* Mode & Scan Control Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">โหมดบันทึก:</label>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs w-full sm:w-auto">
                  <button
                    onClick={() => { setAutoDetectType(true); }}
                    className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      autoDetectType ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ตรวจจับอัตโนมัติ
                  </button>
                  <button
                    onClick={() => { setAutoDetectType(false); setScanType('check_in'); }}
                    className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      !autoDetectType && scanType === 'check_in' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    เข้างาน (In)
                  </button>
                  <button
                    onClick={() => { setAutoDetectType(false); setScanType('check_out'); }}
                    className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      !autoDetectType && scanType === 'check_out' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ออกงาน (Out)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Voice Test Buttons */}
                <div className="flex items-center space-x-1 px-2 py-1 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs text-pink-700 dark:text-pink-300">
                  <Volume2 className="w-3.5 h-3.5 shrink-0 text-pink-600 dark:text-pink-400" />
                  <span className="font-semibold text-[11px]">เสียงตอบรับ:</span>
                  <button
                    type="button"
                    onClick={() => playScanAudio(true, 'check_in')}
                    className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 rounded text-[11px] font-medium text-pink-700 transition-colors cursor-pointer"
                    title="ทดสอบเสียงเข้างาน: สู้ๆนะคะ"
                  >
                    สู้ๆนะคะ
                  </button>
                  <button
                    type="button"
                    onClick={() => playScanAudio(true, 'check_out')}
                    className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 rounded text-[11px] font-medium text-pink-700 transition-colors cursor-pointer"
                    title="ทดสอบเสียงออกงาน: กลับบ้านดีๆนะคะ"
                  >
                    กลับบ้านดีๆนะคะ
                  </button>
                </div>

                {/* Main 1:1 Scan Action Button */}
                <button
                  id="btn-scan-face-now"
                  onClick={() => executeScan()}
                  disabled={isScanning || !selectedEmployee}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังวิเคราะห์อัตลักษณ์...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>สแกนยืนยันตัวตน 1:1 คุณ {selectedEmployee ? selectedEmployee.name : 'พนักงาน'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Scan Result Feedback Card with Side-by-Side Face Verification Proof */}
          {lastScanResult && (
            <div
              className={`rounded-2xl p-5 border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                lastScanResult.success
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-50/95 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
              }`}
            >
              <div className="flex items-start space-x-3">
                {lastScanResult.success ? (
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-base font-bold">
                      {lastScanResult.success ? '✅ ยืนยันตัวตน 1:1 สำเร็จ (Verified)' : '❌ ตรวจพิสูจน์อัตลักษณ์ไม่ผ่าน (Rejected)'}
                    </h4>
                    {lastScanResult.confidence !== undefined && (
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                        lastScanResult.success
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 text-rose-800 dark:text-rose-200'
                      }`}>
                        AI Confidence: {lastScanResult.confidence}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm mt-1 font-medium leading-relaxed">
                    {lastScanResult.message}
                  </p>

                  {/* Side-by-Side Biometric Comparison (Master vs Live) */}
                  <div className="mt-4 p-3.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>หลักฐานเปรียบเทียบอัตลักษณ์ชีวมิติ (1:1 Master vs Live Face)</span>
                      </span>
                      {lastScanResult.verifiedWithAi && (
                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                          ✨ Gemini AI Biometric Vision
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Master Registered Photo */}
                      <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          ภาพต้นแบบที่ลงทะเบียน
                        </span>
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-blue-400/60 shadow-inner bg-slate-950">
                          {lastScanResult.masterPhotoUrl ? (
                            <img
                              src={lastScanResult.masterPhotoUrl}
                              alt="ภาพต้นแบบ"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">ไม่มีรูป</div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1.5 truncate max-w-[130px]">
                          {lastScanResult.employee?.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          (รหัส {lastScanResult.employee?.id})
                        </span>
                      </div>

                      {/* Live Captured Photo */}
                      <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          ภาพถ่ายสดหน้ากล้อง
                        </span>
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 shadow-inner bg-slate-950 ${
                          lastScanResult.success ? 'border-emerald-500' : 'border-rose-500'
                        }`}>
                          {lastScanResult.photoUrl ? (
                            <img
                              src={lastScanResult.photoUrl}
                              alt="ภาพสดหน้ากล้อง"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">ไม่มีรูป</div>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold mt-1.5 ${
                          lastScanResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {lastScanResult.success ? 'ตรงกับต้นแบบ' : 'ไม่ตรงกับต้นแบบ'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          สแกนเมื่อ {lastScanResult.timestamp || formattedTime}
                        </span>
                      </div>
                    </div>

                    {lastScanResult.reasoning && (
                      <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-xs text-blue-950 dark:text-blue-200">
                        <span className="font-bold">ผลการตรวจวิเคราะห์: </span>
                        <span>{lastScanResult.reasoning}</span>
                      </div>
                    )}
                  </div>

                  {/* If employee is pending accountant approval */}
                  {!lastScanResult.success && lastScanResult.employee && lastScanResult.employee.approvalStatus !== 'approved' && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                      <div className="flex items-center space-x-1.5 font-bold mb-1 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>เงื่อนไขความปลอดภัยองค์กร:</span>
                      </div>
                      <p className="text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed">
                        บัญชีพนักงานนี้<strong>ต้องได้รับการยืนยันจากฝ่ายบัญชีก่อนเท่านั้น</strong>{' '}
                        จึงจะสามารถเปิดสิทธิ์ให้บันทึกเวลาเข้า-ออกงานได้
                      </p>
                      <button
                        onClick={onNavigateToApproval}
                        className="mt-2.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        <span>ไปที่เมนู &quot;อนุมัติโดยบัญชี&quot; เพื่อกดยืนยัน</span>
                      </button>
                    </div>
                  )}

                  {/* Success details: Shift compliance, on time or late */}
                  {lastScanResult.success && lastScanResult.employee && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">พนักงาน:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{lastScanResult.employee.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">ประเภทบันทึก:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          {lastScanResult.type === 'check_in' ? '🟢 เข้างาน (In)' : '🔵 ออกงาน (Out)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">เวลาที่บันทึก:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{lastScanResult.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">สถานะกะเวลา:</span>
                        {lastScanResult.status === 'on_time' && (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">ตรงเวลาปกติ</span>
                        )}
                        {lastScanResult.status === 'late' && (
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            สาย {lastScanResult.lateMinutes} นาที
                          </span>
                        )}
                        {lastScanResult.status === 'overtime' && (
                          <span className="font-semibold text-purple-700 dark:text-purple-400">
                            OT {Math.floor((lastScanResult.otMinutes || 0) / 60)} ชม.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Step 1 Employee Selection & Quick Real Face Enrollment */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Active / Selected Employee Card */}
          {selectedEmployee && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-blue-500/80 dark:border-blue-500/60 shadow-md transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5">
                  <BadgeCheck className="w-4 h-4" />
                  <span>พนักงานที่เลือกสำหรับการสแกน 1:1</span>
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-md">
                  {selectedEmployee.id}
                </span>
              </div>

              <div className="flex items-center space-x-3.5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                  <img
                    src={selectedEmployee.photoUrl}
                    alt={selectedEmployee.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedEmployee.photoUrl?.startsWith('data:image') && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[8px] text-white font-bold" title="ใช้ภาพถ่ายจริง">
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {selectedEmployee.name}
                    </h3>
                    {selectedEmployee.nickname && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        ({selectedEmployee.nickname})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedEmployee.department} • {selectedEmployee.position}
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                    กะเวลา: {selectedEmployee.shift?.startTime || '08:30'} - {selectedEmployee.shift?.endTime || '17:30'}
                  </p>
                </div>
              </div>

              {/* Master Reference Photo Status & Quick Enrollment Button */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-600 dark:text-slate-400">สถานะภาพต้นแบบในระบบ:</span>
                  {selectedEmployee.photoUrl?.startsWith('data:image') ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>มีภาพถ่ายจริงแล้ว</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ภาพตัวอย่างเริ่มต้น (แนะนำให้ถ่ายภาพจริง)
                    </span>
                  )}
                </div>

                {/* Quick Enroll Button */}
                <button
                  type="button"
                  onClick={handleQuickEnrollFace}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer active:scale-98"
                  title="มองกล้องแล้วกดปุ่มนี้เพื่อถ่ายภาพใบหน้าจริงของคุณบันทึกเป็นภาพต้นแบบ"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>📸 ถ่ายภาพใบหน้าจริงของฉัน เดี๋ยวนี้ (อัปเดตต้นแบบ)</span>
                </button>

                {enrollSuccessMessage && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
                    {enrollSuccessMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Employee Directory Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>ขั้นตอนที่ 1: เลือกพนักงานเพื่อสแกน (1:1 Selection)</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {filteredEmployees.length} คน
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, นามสกุล, หรือรหัสพนักงาน EMP-XXXX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Department Filter Chips */}
            {departments.length > 1 && (
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px]">
                <button
                  onClick={() => setSelectedDepartment('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
                    selectedDepartment === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  ทุกแผนก
                </button>
                {departments.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
                      selectedDepartment === dept
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}

            {/* Employee List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
              {filteredEmployees.map((emp) => {
                const isApproved = emp.approvalStatus === 'approved';
                const isSelected = selectedCandidateId === emp.id;
                const hasRealFace = emp.photoUrl?.startsWith('data:image');

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedCandidateId(emp.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={emp.photoUrl}
                          alt={emp.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{emp.name}</span>
                          {emp.nickname && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">({emp.nickname})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 truncate">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{emp.id}</span>
                          <span>•</span>
                          <span>{emp.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end space-y-1">
                      {isApproved ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full">
                          อนุมัติแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-full animate-pulse">
                          รออนุมัติบัญชี
                        </span>
                      )}

                      {hasRealFace ? (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                          <span>✓ ใบหน้าจริง</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400">ภาพตัวอย่าง</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  ไม่พบพนักงานที่ตรงกับคำค้นหา
                </div>
              )}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>หลักการทำงานแบบ 1:1 Personal Verification</span>
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              1. เลือกบัญชีของคุณจากรายการด้านบน<br />
              2. หากต้องการใช้ภาพจริง ให้กดปุ่ม <strong>&quot;📸 ถ่ายภาพใบหน้าจริงของฉัน เดี๋ยวนี้&quot;</strong> เพื่อบันทึกต้นแบบ<br />
              3. มองกล้องเว็บแคมแล้วกดปุ่ม <strong>&quot;สแกนยืนยันตัวตน 1:1&quot;</strong> ระบบจะส่งภาพไปตรวจเทียบเคียงโครงสร้างใบหน้า ป้องกันการสแกนแทนกันได้ 100%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
