import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanFace, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Camera, 
  CameraOff, 
  User, 
  ReceiptText, 
  TrendingUp, 
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Sparkles,
  Eye,
  ShieldCheck,
  Building2,
  RefreshCw,
  FlipHorizontal,
  Mail,
  MailCheck,
  Lock,
  Send,
  Phone,
  Sun,
  Moon,
  Volume2,
  Smartphone,
  MapPin,
  MapPinned,
  Globe,
  LocateFixed,
  Navigation,
  ShieldAlert,
  CalendarDays
} from 'lucide-react';
import { Employee, AttendanceLog, CompanySettings, MonthlyPayrollSummary, AttendanceType, AttendanceStatus } from '../types';
import { recordAttendanceScan, calculateMonthlyPayroll, updateEmployee } from '../lib/storage';
import { playScanAudio, verifyEmployeeFaceBiometric, calculateDistanceMeters, extractBiometricFromImage } from '../lib/faceDetector';
import { useTheme } from '../lib/theme';
import { StrictFaceRegistrationModal } from './StrictFaceRegistrationModal';
import { EmployeeLeaveView } from './EmployeeLeaveView';

interface EmployeePortalProps {
  employeeId: string;
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  settings: CompanySettings;
  onLogout: () => void;
  onRefreshData?: () => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  employeeId,
  employees,
  attendanceLogs,
  settings,
  onLogout,
  onRefreshData,
}) => {
  const currentEmp = employees.find((e) => e.id === employeeId) || employees[0];
  const { themeMode, effectiveTheme, toggleQuickTheme } = useTheme(settings.themeMode || 'light');

  // Tab: 'attendance' (default), 'payslip' or 'leave'
  const [activeTab, setActiveTab] = useState<'attendance' | 'payslip' | 'leave'>('attendance');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showStrictRegisterModal, setShowStrictRegisterModal] = useState(false);

  // Time & Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter logs for this employee and deduplicate by ID
  const rawMyLogs = attendanceLogs.filter((l) => l.employeeId === currentEmp?.id);
  const seenMyLogIds = new Set<string>();
  const myLogs: AttendanceLog[] = [];
  for (const log of rawMyLogs) {
    if (log && log.id && !seenMyLogIds.has(log.id)) {
      seenMyLogIds.add(log.id);
      myLogs.push(log);
    }
  }
  const todayStr = currentTime.toISOString().split('T')[0];
  const todayLogs = myLogs.filter((l) => l.date === todayStr);

  const todayCheckIn = todayLogs.find((l) => l.type === 'check_in');
  const todayCheckOut = todayLogs.find((l) => l.type === 'check_out');

  // Scanner State
  const [scanType, setScanType] = useState<AttendanceType>(todayCheckIn ? 'check_out' : 'check_in');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessModal, setScanSuccessModal] = useState<AttendanceLog | null>(null);
  const [scanRejectModal, setScanRejectModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confidence?: number;
    photoUrl?: string;
  } | null>(null);
  const [viewPhotoModal, setViewPhotoModal] = useState<string | null>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{
    checking: boolean;
    inRange?: boolean;
    distanceMeters?: number;
    locationName?: string;
    message?: string;
    offsiteAllowed?: boolean;
    latitude?: number;
    longitude?: number;
  }>({ checking: false });

  // Helper to get active company work locations with backwards compatibility
  const getActiveWorkLocations = () => {
    const active = (settings.workLocations || []).filter((l) => l.isActive !== false);
    if (active.length === 0 && settings.officeLatitude && settings.officeLongitude) {
      return [
        {
          id: 'loc-default',
          name: settings.companyName || 'สำนักงานใหญ่',
          latitude: settings.officeLatitude,
          longitude: settings.officeLongitude,
          radiusMeters: settings.maxAllowedRadiusMeters || 200,
          isActive: true,
        },
      ];
    }
    return active;
  };

  // Manual GPS coordinate check handler for employee testing
  const checkCurrentGps = async () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus({
        checking: false,
        message: 'เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS',
      });
      return;
    }

    setGpsStatus({ checking: true, message: 'กำลังค้นหาสัญญาณพิกัด GPS...' });

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        });
      });

      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      const allActive = getActiveWorkLocations();

      // Check authorized locations for this employee
      const isOffsiteAllowed = currentEmp?.allowOffsiteCheckin ?? false;
      const allowedIds = currentEmp?.allowedLocationIds || ['all'];
      const authorizedLocs = allowedIds.includes('all')
        ? allActive
        : allActive.filter((l) => allowedIds.includes(l.id));

      const candidates = authorizedLocs.length > 0 ? authorizedLocs : allActive;
      const evaluated = candidates.map((loc) => {
        const effectiveRadius = Math.min(100, loc.radiusMeters || 100);
        const dist = calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
        return { loc, dist, effectiveRadius, inRange: dist <= effectiveRadius };
      });

      evaluated.sort((a, b) => a.dist - b.dist);
      const closest = evaluated[0];

      if (closest && closest.inRange) {
        setGpsStatus({
          checking: false,
          inRange: true,
          distanceMeters: closest.dist,
          locationName: closest.loc.name,
          latitude: userLat,
          longitude: userLng,
          message: `อยู่ในพื้นที่ล็อค 100 เมตร: ${closest.loc.name} (ห่าง ${closest.dist} ม. จากเกณฑ์รัศมี ${closest.effectiveRadius} ม.)`,
        });
      } else if (isOffsiteAllowed) {
        setGpsStatus({
          checking: false,
          inRange: true,
          offsiteAllowed: true,
          distanceMeters: closest?.dist,
          locationName: 'ปฏิบัติงานนอกสถานที่ (Off-site)',
          latitude: userLat,
          longitude: userLng,
          message: `คุณได้รับสิทธิ์ลงเวลานอกสถานที่ (พิกัดจริงห่าง ${closest ? closest.loc.name : 'สถานที่หลัก'} ${closest?.dist || 0} ม.)`,
        });
      } else {
        const closestName = closest ? closest.loc.name : 'สถานที่ปฏิบัติงาน';
        const closestDist = closest ? closest.dist : 0;
        const allowedRadius = closest ? closest.effectiveRadius : 100;

        setGpsStatus({
          checking: false,
          inRange: false,
          distanceMeters: closestDist,
          locationName: closestName,
          latitude: userLat,
          longitude: userLng,
          message: `อยู่นอกพื้นที่ล็อค 100 เมตร: ห่างจาก ${closestName} ${closestDist} ม. (กำหนดไม่เกิน ${allowedRadius} ม.)`,
        });
      }
    } catch (err: any) {
      setGpsStatus({
        checking: false,
        message: 'ไม่สามารถระบุพิกัดได้ (กรุณากดเปิดอนุญาต Location บนเบราว์เซอร์)',
      });
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Monthly summary stats
  const currentMonthPrefix = todayStr.substring(0, 7); // e.g. "2026-09"
  const monthLogs = myLogs.filter((l) => l.date.startsWith(currentMonthPrefix));

  // Count unique worked days this month
  const uniqueWorkDays = new Set(monthLogs.map((l) => l.date)).size;
  const totalLateMinutes = monthLogs
    .filter((l) => l.type === 'check_in')
    .reduce((acc, l) => acc + (l.lateMinutes || 0), 0);
  const totalOtMinutes = monthLogs
    .filter((l) => l.type === 'check_out')
    .reduce((acc, l) => acc + (l.otMinutes || 0), 0);
  const totalOtHours = Math.round((totalOtMinutes / 60) * 10) / 10;

  // Camera handling with flip / multi-device support
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const refreshCameraDevices = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      } catch (e) {
        console.error('Error enumerating cameras:', e);
      }
    }
  };

  const startCamera = async (targetFacing?: 'user' | 'environment', targetDeviceId?: string) => {
    setCameraError(null);
    const activeFacing = targetFacing || facingMode;
    const activeDeviceId = targetDeviceId !== undefined ? targetDeviceId : selectedCameraId;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const videoConstraints: MediaTrackConstraints = activeDeviceId
          ? { deviceId: { exact: activeDeviceId } }
          : { facingMode: activeFacing, width: { ideal: 640 }, height: { ideal: 480 } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        refreshCameraDevices();
      } else {
        setCameraError('อุปกรณ์ไม่รองรับการเปิดกล้องเว็บแคม แต่คุณสามารถใช้โหมดจำลองสแกนได้');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      // Fallback: try default without constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch {
        setCameraError('ไม่สามารถเข้าถึงกล้องได้ (หากกล้องหลักเสีย กรุณากดปุ่มสลับกล้อง หรือใช้โหมดทดสอบ)');
      }
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setSelectedCameraId('');
    if (cameraActive) {
      startCamera(nextFacing, '');
    }
  };

  const handleSelectCameraDevice = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (cameraActive) {
      startCamera(undefined, deviceId);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleRegisterFaceSnapshot = async () => {
    if (!currentEmp) return;
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      alert('กรุณาเปิดกล้องเว็บแคมและมองตรงมาที่กล้องก่อนถ่ายภาพลงทะเบียนใบหน้า');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const bio = await extractBiometricFromImage(snapshotDataUrl);
    if (!bio.hasFace) {
      alert('❌ ไม่พบใบหน้าหรือแสงสว่างไม่เพียงพอ กรุณามองตรงไปที่กล้องในระยะ 40-60 ซม.');
      return;
    }

    const updatedEmp: Employee = {
      ...currentEmp,
      photoUrl: snapshotDataUrl,
      faceDescriptor: bio.vector
    };

    updateEmployee(updatedEmp);
    alert(`ถ่ายภาพลงทะเบียนใบหน้าสำหรับ คุณ${currentEmp.name} สำเร็จแล้ว! ระบบจะใช้ภาพนี้ในการตรวจสอบสแกนใบหน้าป้องกันการสแกนแทนกัน`);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Face Scan Execution with Real Client-Side Biometric Face Verification
  const handlePerformScan = async (chosenType?: AttendanceType) => {
    if (!currentEmp) return;

    if (currentEmp.approvalStatus === 'pending_accountant') {
      alert('บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากฝ่ายบัญชี จึงยังไม่สามารถสแกนหน้าได้ กรุณาติดต่อฝ่ายบัญชี');
      return;
    }

    if (currentEmp.approvalStatus === 'rejected') {
      alert(`บัญชีของคุณไม่ผ่านการอนุมัติ: ${currentEmp.rejectionReason || 'กรุณาติดต่อฝ่ายบัญชี'}`);
      return;
    }

    // Work Locations & GPS Geofence Verification
    let recordedLocation: {
      latitude?: number;
      longitude?: number;
      locationName?: string;
      distanceMeters?: number;
    } = {};

    const activeLocations = getActiveWorkLocations();

    if (settings.enableGpsVerification && activeLocations.length > 0) {
      if ('geolocation' in navigator) {
        setGpsStatus({ checking: true, message: 'กำลังตรวจสอบพิกัด GPS เทียบกับสถานที่ทำงาน...' });
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, {
              enableHighAccuracy: true,
              timeout: 7000,
            });
          });

          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // Check employee off-site permission and allowed location IDs
          const isOffsiteAllowed = currentEmp.allowOffsiteCheckin ?? false;
          const allowedIds = currentEmp.allowedLocationIds || ['all'];
          const isAllowedAll = allowedIds.includes('all');

          const eligibleLocations = isAllowedAll
            ? activeLocations
            : activeLocations.filter((loc) => allowedIds.includes(loc.id));

          // If employee has specific locations that might be inactive, fallback to all active
          const targetLocations = eligibleLocations.length > 0 ? eligibleLocations : activeLocations;

          // Calculate distance to each eligible location with strict 100m geofence lock
          const evaluated = targetLocations.map((loc) => {
            const effectiveRadius = Math.min(100, loc.radiusMeters || 100);
            const dist = calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
            return {
              loc,
              dist,
              effectiveRadius,
              inRange: dist <= effectiveRadius,
            };
          });

          evaluated.sort((a, b) => a.dist - b.dist);
          const closest = evaluated[0];

          if (closest && closest.inRange) {
            // Inside an authorized location
            recordedLocation = {
              latitude: userLat,
              longitude: userLng,
              locationName: closest.loc.name,
              distanceMeters: closest.dist,
            };

            setGpsStatus({
              checking: false,
              inRange: true,
              distanceMeters: closest.dist,
              locationName: closest.loc.name,
              latitude: userLat,
              longitude: userLng,
              message: `อยู่ในพื้นที่ล็อค 100 เมตร: ${closest.loc.name} (ห่าง ${closest.dist} ม. จากเกณฑ์รัศมี ${closest.effectiveRadius} ม.)`,
            });
          } else if (isOffsiteAllowed) {
            // Outside geofence, but employee has off-site privilege!
            const locLabel = closest ? `นอกสถานที่ (ใกล้ ${closest.loc.name} ${closest.dist} ม.)` : 'ปฏิบัติงานนอกสถานที่';
            recordedLocation = {
              latitude: userLat,
              longitude: userLng,
              locationName: locLabel,
              distanceMeters: closest?.dist,
            };

            setGpsStatus({
              checking: false,
              inRange: true,
              offsiteAllowed: true,
              distanceMeters: closest?.dist,
              locationName: 'ปฏิบัติงานนอกสถานที่ (Off-site)',
              latitude: userLat,
              longitude: userLng,
              message: `ได้รับอนุญาตลงเวลานอกสถานที่ (พิกัดจริงห่าง ${closest ? closest.loc.name : 'สถานที่หลัก'} ${closest?.dist || 0} ม.)`,
            });
          } else {
            // Outside 100m geofence AND off-site not permitted -> REJECT
            const closestName = closest ? closest.loc.name : 'สถานที่ปฏิบัติงาน';
            const closestDist = closest ? closest.dist : 0;
            const allowedRadius = closest ? closest.effectiveRadius : 100;

            setGpsStatus({
              checking: false,
              inRange: false,
              distanceMeters: closestDist,
              locationName: closestName,
              latitude: userLat,
              longitude: userLng,
              message: `อยู่นอกพื้นที่ล็อค 100 เมตร (${closestName}: ห่าง ${closestDist} ม. เกินเกณฑ์ ${allowedRadius} ม.)`,
            });

            playScanAudio(false);
            setScanRejectModal({
              open: true,
              title: '🔒 พิกัด GPS อยู่นอกพื้นที่ทำงาน (เกินรัศมี 100 เมตร)',
              message: `ระบบล็อคพิกัดไม่เกิน 100 เมตรจากพื้นที่จริง: ตรวจพบตำแหน่งของคุณอยู่ห่างจาก "${closestName}" ${closestDist} เมตร (เกณฑ์อนุญาตสูงสุดคือ ${allowedRadius} เมตร) และคุณไม่ได้รับสิทธิ์ลงเวลานอกสถานที่ กรุณาสแกนเมื่อถึงบริเวณสถานที่ทำงาน หรือติดต่อแอดมินเพื่อขอสิทธิ์ Off-site`,
            });
            return;
          }
        } catch (gpsErr) {
          console.warn('GPS location request error:', gpsErr);
          setGpsStatus({
            checking: false,
            message: 'ไม่สามารถตรวจพิกัด GPS ได้ (กรุณาเปิด Location บนอุปกรณ์)',
          });

          // If GPS is strictly enabled and employee is not offsite, block check-in to prevent bypassing 100m lock
          if (settings.enableGpsVerification && !currentEmp.allowOffsiteCheckin) {
            playScanAudio(false);
            setScanRejectModal({
              open: true,
              title: '🔒 จำเป็นต้องเปิด GPS เพื่อตรวจสอบรัศมี 100 เมตร',
              message: 'ระบบตั้งค่าบังคับตรวจสอบพิกัด GPS เพื่อยืนยันว่าสแกนในระยะไม่เกิน 100 เมตรจากพื้นที่ทำงานจริง กรุณากดอนุญาตการเข้าถึงตำแหน่ง (Location Permission) ในเบราว์เซอร์หรืออุปกรณ์ของคุณ แล้วลองสแกนใหม่อีกครั้ง',
            });
            return;
          }
        }
      }
    }

    const type = chosenType || scanType;
    setIsScanning(true);

    // Capture frame from webcam if available
    let capturedPhoto = currentEmp.photoUrl;
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    // Run client-side biometric matching (1:1 personal employee verification)
    const matchResult = await verifyEmployeeFaceBiometric(capturedPhoto, currentEmp);

    setIsScanning(false);

    // If biometric verification fails (someone else's face, or no face)
    if (!matchResult.matched) {
      playScanAudio(false);
      setScanRejectModal({
        open: true,
        title: 'การยืนยันใบหน้าไม่สำเร็จ (ปฏิเสธการลงเวลา)',
        message: matchResult.message,
        confidence: matchResult.confidence,
        photoUrl: capturedPhoto,
      });
      return;
    }

    // Biometric match verified!
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check shift calculations
    const [shiftStartH, shiftStartM] = (currentEmp.shift?.startTime || '08:30').split(':').map(Number);
    const [shiftEndH, shiftEndM] = (currentEmp.shift?.endTime || '17:30').split(':').map(Number);
    const grace = currentEmp.shift?.graceMinutes || 15;

    let status: AttendanceStatus = 'on_time';
    let lateMinutes = 0;
    let otMinutes = 0;

    if (type === 'check_in') {
      const shiftStartTotal = shiftStartH * 60 + shiftStartM;
      const currentTotal = hours * 60 + minutes;
      const allowedTime = shiftStartTotal + grace;

      if (currentTotal > allowedTime) {
        status = 'late';
        lateMinutes = currentTotal - allowedTime;
      } else {
        status = 'on_time';
      }
    } else {
      // check_out
      const shiftEndTotal = shiftEndH * 60 + shiftEndM;
      const currentTotal = hours * 60 + minutes;

      if (currentTotal < shiftEndTotal - 15) {
        status = 'early_leave';
      } else if (currentTotal > shiftEndTotal + 30) {
        status = 'overtime';
        otMinutes = currentTotal - shiftEndTotal;
      } else {
        status = 'on_time';
      }
    }

    const newLog: AttendanceLog = {
      id: `LOG-${Date.now()}`,
      employeeId: currentEmp.id,
      employeeName: currentEmp.name,
      department: currentEmp.department,
      date: todayStr,
      time: timeStr,
      timestamp: Date.now(),
      type,
      status,
      lateMinutes,
      otMinutes,
      faceConfidence: matchResult.confidence,
      capturedPhoto,
      verified: true,
      locationName: recordedLocation.locationName,
      latitude: recordedLocation.latitude,
      longitude: recordedLocation.longitude,
      distanceMeters: recordedLocation.distanceMeters,
      notes:
        type === 'check_in'
          ? status === 'late'
            ? `มาสาย ${lateMinutes} นาที (กะ ${currentEmp.shift?.startTime})`
            : `เข้างานตรงเวลา (กะ ${currentEmp.shift?.startTime})`
          : status === 'overtime'
          ? `โอที ${Math.floor(otMinutes / 60)} ชม. ${otMinutes % 60} น.`
          : 'ออกงานตามเวลา',
    };

    recordAttendanceScan(newLog);
    playScanAudio(true, type);
    setScanSuccessModal(newLog);

    // Toggle default next scan type
    setScanType(type === 'check_in' ? 'check_out' : 'check_in');

    if (onRefreshData) onRefreshData();
  };

  // Safe fallback if no employee found
  if (!currentEmp) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 font-['Sarabun',sans-serif]">
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold">ไม่พบข้อมูลพนักงานสำหรับบัญชีนี้</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ระบบไม่พบข้อมูลพนักงานที่ตรงกับรหัสที่เข้าสู่ระบบ กรุณาติดต่อฝ่ายบุคคลหรือออกจากระบบเพื่อลองใหม่อีกครั้ง
          </p>
          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // Get My Payslip Record
  const monthlySummary: MonthlyPayrollSummary = calculateMonthlyPayroll(currentMonthPrefix);
  const myPayrollRecord = monthlySummary.records.find((r) => r.employeeId === currentEmp.id);
  const [requestSent, setRequestSent] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  const handleRequestPayslip = () => {
    setRequestSent(true);
    setRequestSuccessMessage(
      `ระบบได้บันทึกคำขอรับสลิปเงินเดือนของคุณแล้ว และส่งการแจ้งเตือนไปยัง ${settings.accountantName} (ฝ่ายบัญชี/การเงิน) เรียบร้อยแล้ว เจ้าหน้าที่จะจัดส่งไฟล์สลิป A4 ให้ทางอีเมล ${currentEmp.email} หรือสามารถติดต่อขอรับเอกสารตัวจริงได้ที่สำนักงาน`
    );
    setTimeout(() => setRequestSuccessMessage(null), 10000);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-['Sarabun',sans-serif] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Employee Portal Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs no-print transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: User badge */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={currentEmp.photoUrl}
                  alt={currentEmp.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-600 shadow-xs"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    currentEmp.approvalStatus === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={currentEmp.approvalStatus === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{currentEmp.name}</span>
                  {currentEmp.nickname && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">({currentEmp.nickname})</span>
                  )}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">
                    {currentEmp.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <span>{currentEmp.department}</span>
                  <span>•</span>
                  <span>{currentEmp.position}</span>
                </div>
              </div>
            </div>

            {/* Right: Theme Toggle, Clock & Logout */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Quick Dark Mode Toggle */}
              <button
                id="btn-employee-theme-toggle"
                type="button"
                onClick={toggleQuickTheme}
                title={effectiveTheme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center"
                aria-label="สลับโหมดสว่าง/มืด"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-in zoom-in" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700 animate-in zoom-in" />
                )}
              </button>

              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {currentTime.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <button
                id="btn-employee-logout"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-all cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Account Approval Notice if Pending */}
        {currentEmp.approvalStatus === 'pending_accountant' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start space-x-3 text-amber-800 dark:text-amber-200 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-100">
                สถานะบัญชี: รอการตรวจสอบและอนุมัติจากฝ่ายบัญชี
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                เจ้าหน้าที่ฝ่ายบัญชี ({settings.accountantName || 'ฝ่ายบัญชีและการเงิน'}) กำลังตรวจสอบข้อมูลและโครงสร้างค่าจ้าง เมื่ออนุมัติแล้วระบบจะเปิดสิทธิ์ให้สแกนหน้าเข้างานทันที
              </p>
            </div>
          </div>
        )}

        {/* Tab switcher: Attendance (สแกนหน้า & เวลาเข้าออก) vs Payslip (สลิปเงินเดือน A4) vs Leave (ขอลา & ขอหยุดงาน) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              id="tab-my-attendance"
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <ScanFace className="w-4 h-4 shrink-0" />
              <span>สแกนหน้า & บันทึกเวลา</span>
            </button>

            <button
              id="tab-my-leave"
              onClick={() => setActiveTab('leave')}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leave'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>ขอลา & ขอหยุดงาน</span>
            </button>

            <button
              id="tab-my-payslip"
              onClick={() => setActiveTab('payslip')}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payslip'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>สลิปเงินเดือน</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-xs">
            {settings.companyName}
          </div>
        </div>

        {/* TAB 1: ATTENDANCE & PERSONAL FACE SCANNER */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Strict Face Registration Banner Callout */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl border border-emerald-700/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span>{(currentEmp as any).faceLivenessVerified ? '✓ บัญชีนี้ผ่านการลงทะเบียนใบหน้าชีวมิติมิติรัดกุมแล้ว (Liveness Verified)' : '⚠️ แนะนำ: ลงทะเบียนใบหน้ามิติรัดกุม 3 ขั้นตอน'}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {(currentEmp as any).faceLivenessVerified 
                      ? `ลงทะเบียนใบหน้ามิติรัดกุมเรียบร้อยเมื่อ ${new Date((currentEmp as any).faceRegisteredAt || currentEmp.registeredAt).toLocaleDateString('th-TH')} (สามารถลงทะเบียนภาพใหม่ได้ตลอดเวลา)` 
                      : 'ถ่ายภาพลงทะเบียนด้วยระบบ Liveness Detection 3 ขั้นตอน (หน้าตรง/กะพริบตา/ระยะโฟกัส) ป้องกันการแอบอ้างสแกนแทน 100%'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStrictRegisterModal(true)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all shrink-0 cursor-pointer"
              >
                <ScanFace className="w-4 h-4" />
                <span>{(currentEmp as any).faceLivenessVerified ? 'ถ่ายลงทะเบียนใบหน้าใหม่' : 'เริ่มลงทะเบียนใบหน้าทันที'}</span>
              </button>
            </div>

            {/* Top Grid: Scanner & Today's Shift Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Personal Independent Face Scanner (lg:col-span-7) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <ScanFace className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>สแกนใบหน้าเข้า-ออกงานส่วนตัว</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      สแกนหน้าอิสระผ่านอุปกรณ์ของคุณเอง ไม่ต้องรอต่อคิวที่ตู้ส่วนกลาง
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                    <button
                      id="btn-flip-camera-employee"
                      type="button"
                      onClick={handleFlipCamera}
                      className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                      title="กลับกล้องหน้า/หลัง เผื่อกรณีกล้องเสียหรือต้องการสลับกล้อง"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span>{facingMode === 'user' ? 'กลับกล้อง (หลัง)' : 'กลับกล้อง (หน้า)'}</span>
                    </button>

                    {availableCameras.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => handleSelectCameraDevice(e.target.value)}
                        className="px-2 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer max-w-[160px] truncate"
                        title="เลือกอุปกรณ์กล้อง (กรณีมีหลายกล้องหรือกล้องเดิมเสีย)"
                      >
                        <option value="">กล้องมาตรฐาน ({facingMode === 'user' ? 'หน้า' : 'หลัง'})</option>
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.deviceId || idx} value={cam.deviceId}>
                            {cam.label || `กล้องตัวที่ ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}

                    {cameraActive ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={handleRegisterFaceSnapshot}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center space-x-1 cursor-pointer shadow-2xs"
                          title="ถ่ายภาพใบหน้าสดเพื่อใช้เป็นภาพต้นแบบในการยืนยันตัวตน"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>ถ่ายลงทะเบียนใบหน้า</span>
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center space-x-1 cursor-pointer"
                        >
                          <CameraOff className="w-3.5 h-3.5" />
                          <span>ปิดกล้อง</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startCamera()}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center space-x-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>เปิดกล้องเว็บแคม</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Camera / Viewfinder Box */}
                <div className="relative aspect-4/3 w-full bg-slate-900 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 dark:border-slate-800 shadow-inner">
                  {/* Real video stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Hidden canvas for snapshot capture */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Placeholder / Sample view if camera is off */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-blue-400/60 p-1 mb-3">
                        <img
                          src={currentEmp.photoUrl}
                          alt={currentEmp.name}
                          className="w-full h-full object-cover rounded-full filter brightness-90"
                        />
                        <div className="absolute inset-0 bg-blue-500/10 rounded-full" />
                      </div>
                      <p className="text-xs font-medium text-slate-200">
                        พร้อมสแกนใบหน้าด้วยรูปโปรไฟล์ที่ลงทะเบียน
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        คุณสามารถกดเปิดกล้องเพื่อสแกนสด หรือกดปุ่มสแกนทันทีเพื่อบันทึกเวลา
                      </p>
                      <button
                        onClick={startCamera}
                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>เปิดกล้องเพื่อสแกนใบหน้า</span>
                      </button>
                    </div>
                  )}

                  {/* Face Framing Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-56 border-2 border-dashed border-blue-400/70 rounded-[45%] relative">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600/80 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-full font-mono">
                        FACE DETECT
                      </div>

                      {/* Scanning Line Animation */}
                      {isScanning && (
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[bounce_1.5s_infinite]" />
                      )}
                    </div>
                  </div>

                  {/* Recognition Match Tag */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] flex items-center space-x-1.5 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>จับคู่พนักงาน: <strong>{currentEmp.name}</strong></span>
                  </div>
                </div>

                {cameraError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </p>
                )}

                {/* Face ID Biometric Anti-Proxy Security Banner */}
                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>ระบบ Face ID ป้องกันการสแกนแทนกัน (1:1)</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-semibold">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        ระบบจะตรวจจับโครงหน้าสดหน้ากล้องเทียบกับคุณ <strong>{currentEmp.name}</strong> หากไม่ใช่เจ้าของเครื่องระบบจะปฏิเสธทันที
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPwaGuide(true)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs w-full sm:w-auto justify-center"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>วิธีติดแอปบนมือถือ</span>
                    </button>
                  </div>
                </div>

                {/* GPS Verification Status Bar (if enabled) */}
                {settings.enableGpsVerification && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <MapPinned className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ระบบล็อคพิกัด GPS รัศมีไม่เกิน 100 เมตร
                        </span>
                        <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold font-mono">
                          {'<= 100m Lock'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {currentEmp.allowOffsiteCheckin ? (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold flex items-center space-x-1 border border-blue-200 dark:border-blue-800">
                            <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>สิทธิ์ Off-site / นอกสถานที่</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-medium">
                            เฉพาะสถานที่ที่กำหนด (รัศมี 100 ม.)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={checkCurrentGps}
                          disabled={gpsStatus.checking}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <LocateFixed className={`w-3 h-3 text-blue-600 ${gpsStatus.checking ? 'animate-spin' : ''}`} />
                          <span>{gpsStatus.checking ? 'กำลังค้นหา...' : 'ทดสอบพิกัด GPS'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400 truncate pr-2">
                        {gpsStatus.message || (
                          currentEmp.allowOffsiteCheckin
                            ? 'คุณได้รับสิทธิ์ลงเวลานอกสถานที่ (ระบบจะบันทึกพิกัดจริงและระยะห่างสาขาอัตโนมัติ)'
                            : `ระบบจะตรวจสอบพิกัด GPS ไม่ให้เกิน 100 เมตรจาก ${getActiveWorkLocations().map(l => l.name).join(', ')} เมื่อกดสแกน`
                        )}
                      </span>
                      {gpsStatus.inRange !== undefined && (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                            gpsStatus.inRange
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {gpsStatus.inRange ? (gpsStatus.offsiteAllowed ? 'อนุญาต (Off-site)' : 'อยู่ในรัศมี 100ม.') : 'อยู่นอกรัศมี 100ม.'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Scan Action Controls */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">เลือกประเภทการลงเวลา:</span>
                    <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 rounded-lg text-[10px] text-pink-700 dark:text-pink-300">
                      <Volume2 className="w-3 h-3 text-pink-600 dark:text-pink-400 shrink-0 animate-pulse" />
                      <span className="font-semibold">เสียงผู้หญิง (Siri):</span>
                      <button
                        type="button"
                        onClick={() => playScanAudio(true, 'check_in')}
                        className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded font-medium text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer active:scale-95"
                        title="ทดสอบเสียงเข้างาน: สู้ๆนะคะ"
                      >
                        🔊 สู้ๆนะคะ
                      </button>
                      <button
                        type="button"
                        onClick={() => playScanAudio(true, 'check_out')}
                        className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-pink-100 dark:hover:bg-pink-900/60 rounded font-medium text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer active:scale-95"
                        title="ทดสอบเสียงออกงาน: กลับบ้านดีๆนะคะ"
                      >
                        🔊 กลับบ้านดีๆนะคะ
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      id="btn-select-checkin"
                      type="button"
                      onClick={() => setScanType('check_in')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        scanType === 'check_in'
                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>ลงเวลาเข้างาน (Check In)</span>
                    </button>

                    <button
                      id="btn-select-checkout"
                      type="button"
                      onClick={() => setScanType('check_out')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        scanType === 'check_out'
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>ลงเวลาออกงาน (Check Out)</span>
                    </button>
                  </div>

                  {/* Scan Submit Button */}
                  <button
                    id="btn-trigger-personal-scan"
                    disabled={isScanning || currentEmp.approvalStatus !== 'approved'}
                    onClick={() => handlePerformScan()}
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer ${
                      currentEmp.approvalStatus !== 'approved'
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed'
                        : scanType === 'check_in'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/25'
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/25'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>กำลังประมวลผลสแกนใบหน้า...</span>
                      </>
                    ) : (
                      <>
                        <ScanFace className="w-5 h-5" />
                        <span>
                          {scanType === 'check_in'
                            ? 'กดสแกนใบหน้าบันทึกเวลาเข้างาน'
                            : 'กดสแกนใบหน้าบันทึกเวลาออกงาน'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Shift details & Today Status Card (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4 flex flex-col">
                {/* Today's Attendance Status Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      สถานะการลงเวลาประจำวันนี้
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {todayStr}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Check In Box */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                        เวลาเข้างาน (Check In)
                      </div>
                      {todayCheckIn ? (
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            {todayCheckIn.time.substring(0, 5)} น.
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              todayCheckIn.status === 'on_time'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {todayCheckIn.status === 'on_time'
                              ? '✓ ตรงเวลา'
                              : `สาย ${todayCheckIn.lateMinutes} นาที`}
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-xs py-1">
                          ยังไม่ได้ลงเวลาเข้า
                        </div>
                      )}
                    </div>

                    {/* Check Out Box */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                        เวลาออกงาน (Check Out)
                      </div>
                      {todayCheckOut ? (
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            {todayCheckOut.time.substring(0, 5)} น.
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              todayCheckOut.status === 'overtime'
                                ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {todayCheckOut.status === 'overtime'
                              ? `+OT ${Math.round((todayCheckOut.otMinutes / 60) * 10) / 10} ชม.`
                              : '✓ ปกติ'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-xs py-1">
                          ยังไม่ได้ลงเวลาออก
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shift Configuration Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>ข้อมูลกะงานที่ได้รับมอบหมาย (Shift Schedule)</span>
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">เวลากะเข้า-ออกงาน</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {currentEmp.shift?.startTime || '08:30'} - {currentEmp.shift?.endTime || '17:30'} น.
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">ระยะเวลาผ่อนผันการสาย (Grace Period)</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/80">
                        {currentEmp.shift?.graceMinutes || 15} นาที
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">วันทำงานต่อสัปดาห์</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentEmp.shift?.workDaysPerWeek || 5} วัน / สัปดาห์
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-500 dark:text-slate-400">อัตราค่าล่วงเวลา (OT)</span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 font-mono">
                        {currentEmp.otRatePerHour || 150} บาท / ชม.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Metrics Card */}
                <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-3xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-100">
                      สถิติเดือนนี้ ({currentMonthPrefix})
                    </span>
                    <TrendingUp className="w-4 h-4 text-blue-200" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                      <div className="text-lg font-black">{uniqueWorkDays}</div>
                      <div className="text-[10px] text-blue-200">วันทำงานจริง</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                      <div className="text-lg font-black">{totalLateMinutes}</div>
                      <div className="text-[10px] text-blue-200">นาทีมาสาย</div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl">
                      <div className="text-lg font-black">{totalOtHours}</div>
                      <div className="text-[10px] text-blue-200">ชม. OT สะสม</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance History Table for this employee */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>ประวัติบันทึกเวลาเข้า-ออกงานของคุณ ({myLogs.length} รายการ)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    บันทึกเวลาพร้อมภาพถ่ายการสแกนใบหน้าเพื่อความโปร่งใส
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('payslip')}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>สลิปเงินเดือน (ทางอีเมล)</span>
                </button>
              </div>

              {myLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                  ยังไม่มีประวัติการสแกนเข้างาน
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">วันที่</th>
                        <th className="px-4 py-3">เวลา</th>
                        <th className="px-4 py-3">ประเภท</th>
                        <th className="px-4 py-3">สถานะ</th>
                        <th className="px-4 py-3">สถานที่ / พิกัด</th>
                        <th className="px-4 py-3">ความแม่นยำ</th>
                        <th className="px-4 py-3 text-right">ภาพถ่ายหลักฐาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {myLogs.map((log, idx) => {
                        return (
                          <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 font-mono">
                              {log.date}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white font-mono">
                              {log.time} น.
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  log.type === 'check_in'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                }`}
                              >
                                {log.type === 'check_in' ? 'เข้างาน' : 'ออกงาน'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {log.status === 'on_time' && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">ตรงเวลา</span>
                              )}
                              {log.status === 'late' && (
                                <span className="text-amber-700 dark:text-amber-400 font-bold">สาย {log.lateMinutes} นาที</span>
                              )}
                              {log.status === 'overtime' && (
                                <span className="text-indigo-700 dark:text-indigo-400 font-bold">+OT {log.otMinutes} นาที</span>
                              )}
                              {log.status === 'early_leave' && (
                                <span className="text-red-600 dark:text-red-400 font-bold">ออกก่อนเวลา</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {log.locationName ? (
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span>{log.locationName}</span>
                                  </div>
                                  {log.distanceMeters !== undefined && (
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                      ห่างจุดเช็คอิน {log.distanceMeters} ม.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-[11px]">สำนักงาน</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">
                              {log.faceConfidence ? `${log.faceConfidence}%` : '98.5%'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {log.capturedPhoto ? (
                                <button
                                  type="button"
                                  onClick={() => setViewPhotoModal(log.capturedPhoto)}
                                  className="inline-flex items-center space-x-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium cursor-pointer"
                                >
                                  <img
                                    src={log.capturedPhoto}
                                    alt="scan"
                                    className="w-7 h-7 rounded object-cover border border-slate-300 dark:border-slate-700"
                                  />
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY PAYSLIP VIEW */}
        {activeTab === 'payslip' && (
          <div className="space-y-6">
            {/* Notice / Policy Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 text-white shadow-md border border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span>บริการรับสลิปเงินเดือน A4 ประจำงวด {monthlySummary.periodName}</span>
                    </h3>
                    <p className="text-xs text-blue-200 mt-0.5">
                      ตามระเบียบบริษัท: สำหรับสลิปเงินเดือนในกรณีพนักงาน จะต้องรอให้เจ้าหน้าที่ส่งให้ทางเมลหรือขอจากเจ้าหน้าที่เท่านั้น
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    id="btn-request-payslip-staff"
                    type="button"
                    onClick={handleRequestPayslip}
                    disabled={requestSent}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs ${
                      requestSent
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 cursor-default'
                        : 'bg-white text-slate-900 hover:bg-blue-50'
                    }`}
                  >
                    {requestSent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>ส่งคำขอถึงเจ้าหน้าที่แล้ว</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-blue-600" />
                        <span>ขอสลิปเงินเดือนจากเจ้าหน้าที่</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {requestSuccessMessage && (
                <div className="mt-4 p-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-xs text-emerald-200 flex items-start space-x-2.5 animate-in fade-in zoom-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{requestSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Delivery Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <ReceiptText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    สถานะการจัดส่งสลิปเงินเดือนทางอีเมล
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  งวด {monthlySummary.periodName}
                </span>
              </div>

              {myPayrollRecord?.payslipEmailSent ? (
                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MailCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                          จัดส่งสลิปเงินเดือนทางอีเมลเรียบร้อยแล้ว
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 rounded-full text-[10px] font-bold">
                          Sent
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                        เจ้าหน้าที่ฝ่ายบัญชีได้ส่งไฟล์สลิป A4 ไปยัง: <strong className="font-mono">{currentEmp.email}</strong>
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        เวลาที่จัดส่ง: {myPayrollRecord.emailSentAt || 'จัดส่งแล้ว'} • กรุณาตรวจสอบในกล่องข้อความ (Inbox) หรือโฟลเดอร์ Junk/Spam
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestPayslip}
                    className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    ขอให้เจ้าหน้าที่ส่งอีเมลซ้ำอีกครั้ง
                  </button>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                          อยู่ระหว่างรอเจ้าหน้าที่ฝ่ายบัญชีจัดส่งทางอีเมล
                        </span>
                        <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 rounded-full text-[10px] font-bold">
                          Pending Delivery
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        สลิปเงินเดือน A4 ประจำงวดนี้ จะถูกจัดส่งไปยังอีเมล: <strong className="font-mono">{currentEmp.email}</strong> เมื่อเจ้าหน้าที่ปิดงวดบัญชี
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        หากท่านจำเป็นต้องใช้เอกสารเร่งด่วน สามารถกดปุ่ม &quot;ขอสลิปเงินเดือนจากเจ้าหน้าที่&quot; หรือติดต่อฝ่ายบัญชีได้โดยตรง
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestPayslip}
                    disabled={requestSent}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {requestSent ? 'แจ้งเจ้าหน้าที่แล้ว' : 'ขอสลิปจากเจ้าหน้าที่'}
                  </button>
                </div>
              )}

              {/* Officer Contact Details Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>ข้อมูลติดต่อเจ้าหน้าที่ฝ่ายการเงินและบัญชีผู้ออกเอกสาร</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ผู้รับผิดชอบ:</span>
                    <strong className="text-slate-900 dark:text-white">{settings.accountantName}</strong>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{settings.accountantTitle}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">อีเมลฝ่ายบัญชี:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{settings.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[11px]">เบอร์โทรศัพท์สำนักงาน:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{settings.phoneNumber}</strong>
                  </div>
                </div>
              </div>

              {/* Summary Stats for Employee's Knowledge */}
              {myPayrollRecord ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      สรุปยอดเงินได้สุทธิเบื้องต้นประจำงวด (ประมาณการ)
                    </h5>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>สลิป A4 ฉบับสมบูรณ์จัดส่งทางอีเมล</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-500 dark:text-slate-400">เงินได้รวมทั้งหมด (Gross)</div>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                        ฿{myPayrollRecord.grossIncome.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-red-50/60 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-900/60">
                      <div className="text-xs text-red-600 dark:text-red-400">รายการหักทั้งหมด (Deductions)</div>
                      <div className="text-xl font-black text-red-700 dark:text-red-300 font-mono mt-1">
                        -฿{myPayrollRecord.totalDeductions.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">เงินได้สุทธิที่ได้รับ (Net Pay)</div>
                      <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono mt-1">
                        ฿{myPayrollRecord.netPay.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center space-x-2">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>
                      เอกสารใบจ่ายเงินเดือน (Payslip) มาตรฐาน A4 พร้อมตราสัญลักษณ์และลายมือชื่อผู้มีอำนาจ จะต้องรอให้เจ้าหน้าที่ส่งให้ทางเมล ({currentEmp.email}) หรือขอรับจากเจ้าหน้าที่เท่านั้น
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  ยังไม่มีการคำนวณเงินเดือนสำหรับบัญชีนี้ในระบบ
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LEAVE & TIME-OFF REQUESTS */}
        {activeTab === 'leave' && (
          <EmployeeLeaveView
            currentEmp={currentEmp}
            settings={settings}
            onRefreshData={onRefreshData}
          />
        )}
      </main>

      {/* Success Scan Confirmation Modal */}
      {scanSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {scanSuccessModal.type === 'check_in' ? 'บันทึกเวลาเข้างานสำเร็จ!' : 'บันทึกเวลาออกงานสำเร็จ!'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ระบบตรวจจับใบหน้าตรงกัน {scanSuccessModal.faceConfidence}%
            </p>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">พนักงาน:</span>
                <span className="font-bold text-slate-900 dark:text-white">{scanSuccessModal.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">เวลาที่บันทึก:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{scanSuccessModal.time} น.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">สถานะ:</span>
                <span
                  className={`font-bold ${
                    scanSuccessModal.status === 'on_time' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {scanSuccessModal.status === 'on_time'
                    ? 'ตรงเวลา'
                    : scanSuccessModal.status === 'late'
                    ? `สาย ${scanSuccessModal.lateMinutes} นาที`
                    : scanSuccessModal.status}
                </span>
              </div>
              {scanSuccessModal.locationName && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">สถานที่ / พิกัด:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{scanSuccessModal.locationName}</span>
                  </span>
                </div>
              )}
              {scanSuccessModal.distanceMeters !== undefined && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">ระยะห่างจุดอ้างอิง:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {scanSuccessModal.distanceMeters} เมตร
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setScanSuccessModal(null)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Biometric Rejection / Anti-Proxy Fraud Modal */}
      {scanRejectModal && scanRejectModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border-2 border-red-500 dark:border-red-600 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-3.5 shadow-inner">
              <ShieldAlert className="w-9 h-9 animate-pulse" />
            </div>

            <h3 className="text-base font-black text-red-600 dark:text-red-400">
              {scanRejectModal.title}
            </h3>

            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mt-2 leading-relaxed">
              {scanRejectModal.message}
            </p>

            {scanRejectModal.photoUrl && (
              <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center space-x-3 text-left">
                <img
                  src={scanRejectModal.photoUrl}
                  alt="Captured face"
                  className="w-14 h-14 rounded-lg object-cover border border-red-300 dark:border-red-800 shrink-0"
                />
                <div className="text-[11px] space-y-0.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">ภาพที่ตรวจจับได้จากกล้อง:</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    ความคล้ายคลึง: <span className="font-mono font-bold text-red-600 dark:text-red-400">{scanRejectModal.confidence || 0}%</span> (เกณฑ์ 82.0%)
                  </div>
                  <div className="text-red-600 dark:text-red-400 font-medium">
                    ⚠️ โครงหน้าไม่ตรงกับพนักงาน
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-left border border-red-200 dark:border-red-900/50">
              <div className="text-[11px] font-bold text-red-800 dark:text-red-300 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>ระเบียบบริษัทการบันทึกเวลา:</span>
              </div>
              <p className="text-[10px] text-red-700 dark:text-red-300/90 mt-0.5 leading-relaxed">
                การให้บุคคลอื่นลงเวลาแทน หรือการพยายามสแกนแทนผู้อื่นถือเป็นความผิดทางวินัย กรุณาให้คุณ <strong>{currentEmp.name}</strong> เป็นผู้สแกนด้วยตนเอง
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScanRejectModal(null)}
              className="mt-4 w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
            >
              รับทราบและลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      )}

      {/* PWA Mobile App Installation Guide Modal */}
      {showPwaGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  วิธีติดตั้งแอปบนหน้าจอมือถือ (เครื่องใครเครื่องมัน)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เปิดสแกนหน้าได้ทันทีจากไอคอนบนจอ ไม่ต้องพิมพ์เว็บใหม่
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* iOS Safari */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] flex items-center justify-center font-bold"></span>
                  <span>สำหรับ iPhone / iPad (เปิดใน Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-1">
                  <li>กดปุ่ม <strong>แชร์ (Share Icon ⬆️)</strong> แถบล่างของ Safari</li>
                  <li>เลื่อนลงมาแล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)&quot;</strong></li>
                  <li>กด <strong>&quot;เพิ่ม (Add)&quot;</strong> ที่มุมขวาบน</li>
                </ol>
              </div>

              {/* Android Chrome */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">🤖</span>
                  <span>สำหรับ Android (เปิดใน Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-1">
                  <li>กดปุ่มจุดสามจุด <strong>(⋮)</strong> ที่มุมขวาบนของ Google Chrome</li>
                  <li>เลือก <strong>&quot;ติดตั้งแอป (Install App)&quot;</strong> หรือ <strong>&quot;เพิ่มลงในหน้าจอหลัก&quot;</strong></li>
                  <li>กดยืนยันการติดตั้ง</li>
                </ol>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300">
              💡 <strong>ข้อดี:</strong> พนักงานสแกนหน้าจากเครื่องตนเองได้อย่างรวดเร็ว มีระบบ Face ID ตรวจจับเฉพาะเจ้าของเครื่อง ไม่ต้องต่อคิวหน้าตู้
            </div>

            <button
              type="button"
              onClick={() => setShowPwaGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
            >
              เข้าใจแล้ว ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}

      {/* Enlarged Photo Modal */}
      {viewPhotoModal && (
        <div 
          onClick={() => setViewPhotoModal(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <img src={viewPhotoModal} alt="Scan audit" className="w-full h-auto rounded-xl object-contain max-h-[70vh]" />
            <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400">
              คลิกเพื่อปิด
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 text-center shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              ต้องการออกจากระบบหรือไม่?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              เมื่อออกจากระบบแล้ว คุณจะต้องลงชื่อเข้าใช้ด้วยรหัสพนักงานอีกครั้ง
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Face Registration Modal (3-Step Guided Liveness) */}
      <StrictFaceRegistrationModal
        isOpen={showStrictRegisterModal}
        onClose={() => setShowStrictRegisterModal(false)}
        employee={currentEmp}
        requirePasscode={true}
        onSuccess={(updated) => {
          setShowStrictRegisterModal(false);
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
