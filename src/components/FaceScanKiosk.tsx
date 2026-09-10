import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FlipHorizontal
} from 'lucide-react';
import { Employee, AttendanceType, AttendanceStatus } from '../types';
import { recordAttendanceScan, getAttendanceLogs } from '../lib/storage';
import { 
  captureVideoFrame, 
  matchFaceWithEmployees, 
  playScanAudio,
  autoIdentifyFaceFromCamera,
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
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [scanType, setScanType] = useState<AttendanceType>('check_in');
  const [autoDetectType, setAutoDetectType] = useState<boolean>(true);

  // Scan feedback state
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    employee?: Employee;
    message: string;
    status?: AttendanceStatus;
    lateMinutes?: number;
    otMinutes?: number;
    confidence?: number;
    photoUrl?: string;
    timestamp?: string;
    type?: AttendanceType;
  } | null>(null);

  // Real-time clock display
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        setCameraError('ไม่สามารถเข้าถึงกล้องเว็บแคมได้ (หากกล้องหลักเสีย กรุณากดปุ่มสลับกล้อง หรือใช้โหมดจำลอง)');
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

  // Perform face recognition scan (1:N auto-identify or 1:1 candidate match)
  const executeScan = async (targetEmpId?: string) => {
    setIsScanning(true);
    setLastScanResult(null);

    // Capture snapshot from camera if active
    let snapshotUrl = '';
    if (videoRef.current && cameraActive) {
      snapshotUrl = captureVideoFrame(videoRef.current);
    }

    const empId = targetEmpId || selectedCandidateId;
    if (!snapshotUrl && empId) {
      const matchedEmployee = employees.find(e => e.id === empId);
      if (matchedEmployee) {
        snapshotUrl = matchedEmployee.photoUrl;
      }
    }

    if (!snapshotUrl && !empId) {
      setIsScanning(false);
      alert('กรุณาเปิดกล้อง หรือเลือกพนักงานที่ต้องการสแกน');
      return;
    }

    let matchResult: FaceMatchResult;

    if (empId) {
      // If a specific candidate was chosen or passed
      const targetEmp = employees.find(e => e.id === empId);
      if (targetEmp) {
        matchResult = await verifyEmployeeFaceBiometric(snapshotUrl, targetEmp);
      } else {
        matchResult = await autoIdentifyFaceFromCamera(snapshotUrl, employees);
      }
    } else {
      // 1:N Auto-identification: Employee stands in front of camera
      matchResult = await autoIdentifyFaceFromCamera(snapshotUrl, employees);
    }

    setIsScanning(false);

    if (!matchResult.matched || !matchResult.employee) {
      playScanAudio(false);
      setLastScanResult({
        success: false,
        message: matchResult.message,
        confidence: matchResult.confidence,
        photoUrl: matchResult.snapshotDataUrl || snapshotUrl,
      });
      return;
    }

    // CRITICAL CHECK: Must be approved by Accountant
    if (!matchResult.isApproved) {
      playScanAudio(false);
      setLastScanResult({
        success: false,
        employee: matchResult.employee,
        message: matchResult.message,
        confidence: matchResult.confidence,
        photoUrl: matchResult.snapshotDataUrl || snapshotUrl,
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
        const [shiftStartH, shiftStartM] = emp.shift.startTime.split(':').map(Number);
        const shiftStartTotalMinutes = shiftStartH * 60 + shiftStartM;
        const currentTotalMinutes = currH * 60 + currM;
        const diff = currentTotalMinutes - shiftStartTotalMinutes;

        // If beyond shift start + grace minutes
        if (diff > emp.shift.graceMinutes) {
          status = 'late';
          lateMinutes = diff;
        } else {
          status = 'on_time';
        }
      } else {
        // Check out
        const [shiftEndH, shiftEndM] = emp.shift.endTime.split(':').map(Number);
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
          ? (status === 'late' ? `มาสาย ${lateMinutes} นาที (กะ ${emp.shift.startTime})` : `เข้างานตรงเวลา (กะ ${emp.shift.startTime})`)
          : (status === 'overtime' ? `โอที ${Math.floor(otMinutes/60)} ชม. ${otMinutes%60} น.` : 'ออกงานตามเวลา'),
      };

      recordAttendanceScan(newLog);
      playScanAudio(true, resolvedType);

      setLastScanResult({
        success: true,
        employee: emp,
        message: `สแกนใบหน้าสำเร็จ! บันทึก${resolvedType === 'check_in' ? 'เข้างาน' : 'ออกงาน'}เรียบร้อย`,
        status,
        lateMinutes,
        otMinutes,
        confidence: matchResult.confidence,
        photoUrl: matchResult.snapshotDataUrl,
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
      {/* Top Banner / Time Info */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white mb-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">ตู้สแกนใบหน้าบันทึกเวลาอัจฉริยะ (Face Kiosk)</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Real-Time Sync
              </span>
            </div>
            <p className="text-sm text-slate-400 flex items-center space-x-2 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
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
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {cameraActive ? 'กล้องเว็บแคมพร้อมทำงาน (Live Stream)' : 'สถานะกล้อง'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  id="btn-flip-camera-kiosk"
                  type="button"
                  onClick={toggleFlipCamera}
                  className="text-xs px-2.5 py-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-1 font-semibold transition-colors cursor-pointer"
                  title="สลับกล้องหน้า/หลัง เผื่อกรณีกล้องเสียหรือต้องการใช้อีกกล้อง"
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
                    คลิกปุ่ม &quot;เปิดกล้องเว็บแคม&quot; ด้านบนเพื่อเปิดกล้องจริง หรือเลือกจำลองพนักงานด้านล่าง
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
                    จัดใบหน้าให้อยู่ในกรอบ
                  </span>

                  <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded-md">
                    ระบบวิเคราะห์ความสว่างและตรวจจับอัตโนมัติ
                  </span>
                </div>
              </div>

              {/* In-Frame Status Tag */}
              {isScanning && (
                <div className="absolute top-4 left-4 bg-blue-600/90 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1.5 backdrop-blur-xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังตรวจจับและเทียบเคียงโครงหน้า...</span>
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
                {/* Voice Test Buttons (Siri-like Natural Thai Female Voice) */}
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 rounded-xl text-xs text-pink-700 dark:text-pink-300">
                  <Volume2 className="w-3.5 h-3.5 shrink-0 text-pink-600 dark:text-pink-400 animate-pulse" />
                  <span className="font-semibold">เสียงผู้หญิง (Siri):</span>
                  <button
                    type="button"
                    onClick={() => playScanAudio(true, 'check_in')}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded-md font-medium text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                    title="ทดสอบเสียงเข้างาน: สู้ๆนะคะ"
                  >
                    🔊 สู้ๆนะคะ
                  </button>
                  <button
                    type="button"
                    onClick={() => playScanAudio(true, 'check_out')}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded-md font-medium text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                    title="ทดสอบเสียงออกงาน: กลับบ้านดีๆนะคะ"
                  >
                    🔊 กลับบ้านดีๆนะคะ
                  </button>
                </div>

                <button
                  id="btn-scan-face-now"
                  onClick={() => executeScan()}
                  disabled={isScanning}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังสแกน...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>กดสแกนใบหน้าทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Scan Simulator, Approval Condition Check & Scan Result */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Quick Face Simulator Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>จำลองการตรวจจับพนักงาน (Face Simulator)</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">เลือกเพื่อทดสอบระบบ</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              คลิกเลือกพนักงานเพื่อทดสอบการสแกนใบหน้า (โดยเฉพาะพนักงานที่{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-semibold">ยังไม่ผ่านการอนุมัติจากฝ่ายบัญชี</strong>{' '}
              ระบบจะปฏิเสธการเข้างานตามเงื่อนไขที่กำหนด):
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {employees.map((emp) => {
                const isApproved = emp.approvalStatus === 'approved';
                const isSelected = selectedCandidateId === emp.id;

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedCandidateId(emp.id);
                      executeScan(emp.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-100 dark:ring-blue-900/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={emp.photoUrl}
                        alt={emp.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{emp.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">({emp.nickname})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                          <span>{emp.department}</span>
                          <span>•</span>
                          <span>กะ {emp.shift.startTime} - {emp.shift.endTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isApproved ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full">
                          อนุมัติแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-full animate-pulse">
                          รออนุมัติบัญชี
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scan Result Feedback Card */}
          {lastScanResult && (
            <div
              className={`rounded-2xl p-5 border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                lastScanResult.success
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
              }`}
            >
              <div className="flex items-start space-x-3">
                {lastScanResult.success ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">
                      {lastScanResult.success ? 'บันทึกเวลาสำเร็จ (Verified)' : 'ไม่สามารถบันทึกเวลาได้'}
                    </h4>
                    {lastScanResult.confidence && (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        Face Match {lastScanResult.confidence}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs mt-1 leading-relaxed">
                    {lastScanResult.message}
                  </p>

                  {/* If employee is pending accountant approval, show helpful direct action */}
                  {!lastScanResult.success && lastScanResult.employee && lastScanResult.employee.approvalStatus !== 'approved' && (
                    <div className="mt-3 p-3 bg-white/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                      <div className="flex items-center space-x-1.5 font-bold mb-1 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>เงื่อนไขความปลอดภัยองค์กร:</span>
                      </div>
                      <p className="text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed">
                        แอดมินลงทะเบียนใบหน้าแล้ว แต่<strong>ต้องได้รับการยืนยันจากฝ่ายบัญชีองค์กรก่อนเท่านั้น</strong>{' '}
                        พนักงานจึงจะสามารถสแกนหน้าได้
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
                    <div className="mt-3 pt-3 border-t border-emerald-200/80 dark:border-emerald-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">พนักงาน:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{lastScanResult.employee.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">ประเภทบันทึก:</span>
                        <span className="font-bold text-blue-700 dark:text-blue-400">
                          {lastScanResult.type === 'check_in' ? '🟢 บันทึกเข้างาน' : '🔵 บันทึกออกงาน'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">เวลาที่สแกน:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{lastScanResult.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">สถานะเวลากะ:</span>
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

          {/* Quick Tips */}
          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ระบบสแกนใบหน้าแบบเรียลไทม์</span>
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              เมื่อพนักงานสแกนหน้าสำเร็จ ข้อมูลจะถูกบันทึกลงฐานข้อมูลและส่งสัญญาณแสดงผลแบบเรียลไทม์ทันที ทั้งฝั่งตู้สแกนและหน้าจอฝ่ายบัญชี/ผู้บริหาร
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
