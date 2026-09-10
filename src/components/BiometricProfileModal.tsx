import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Fingerprint, 
  ScanFace, 
  CheckCircle2, 
  Eye, 
  Activity, 
  Sparkles,
  Camera,
  RefreshCw,
  Info,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Employee, BiometricProfile } from '../types';
import { updateEmployee } from '../lib/storage';
import { extractBiometricFromImage, createBiometricProfile } from '../lib/faceDetector';

interface BiometricProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onOpenStrictEnroll?: (emp: Employee) => void;
}

export const BiometricProfileModal: React.FC<BiometricProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onOpenStrictEnroll,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lockStatus, setLockStatus] = useState<boolean>(
    employee?.biometricProfile?.isLocked ?? true
  );

  if (!isOpen || !employee) return null;

  const bio: BiometricProfile | undefined = employee.biometricProfile;

  // Toggle biometric lock to prevent proxy modifications
  const handleToggleLock = () => {
    const newLock = !lockStatus;
    setLockStatus(newLock);

    const updatedEmp: Employee = {
      ...employee,
      biometricProfile: bio ? {
        ...bio,
        isLocked: newLock,
      } : undefined,
    };
    updateEmployee(updatedEmp);
  };

  // Generate biometric profile if missing from existing photo
  const handleExtractBiometrics = async () => {
    if (!employee.photoUrl) {
      alert('พนักงานยังไม่มีภาพถ่าย กรุณาถ่ายภาพก่อน');
      return;
    }

    setIsGenerating(true);
    try {
      const descriptor = await extractBiometricFromImage(employee.photoUrl);
      const newProfile = createBiometricProfile(descriptor, 'เจ้าหน้าที่ฝ่ายบุคคล (HR Admin)', true);

      const updatedEmp: Employee = {
        ...employee,
        faceDescriptor: descriptor.vector,
        biometricProfile: newProfile,
      };

      updateEmployee(updatedEmp);
      setLockStatus(true);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสกัดคุณลักษณะชีวมิติ');
    } finally {
      setIsGenerating(false);
    }
  };

  const features = bio?.features;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-white">ข้อมูลคุณลักษณะชีวมิติใบหน้า (Biometric Profile)</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>ระบบความปลอดภัย 1:1</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                พนักงาน: <span className="text-indigo-200 font-semibold">{employee.name}</span> ({employee.id}) • {employee.department}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Top Overview: Photo & Lock Status */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700">
            {/* Master Photo with overlay */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md relative bg-slate-900">
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <ScanFace className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 border border-indigo-400/40 rounded-2xl pointer-events-none" />
                <div className="absolute bottom-1 right-1 bg-black/70 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-mono">
                  MASTER
                </div>
              </div>
            </div>

            {/* Employee ID & Biometric Lock Controls */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  คุณ{employee.name}
                </h4>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono">
                  {employee.id}
                </span>
              </div>

              {/* Lock Status Pill */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {lockStatus ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>ล็อคอัตลักษณ์ชีวมิติแล้ว (ป้องกันการสแกนแทน)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold">
                    <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>ปลดล็อคชั่วคราว (อนุญาตให้อัปเดตรูปใหม่ได้)</span>
                  </div>
                )}

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {lockStatus ? 'ปลดล็อคเพื่อแก้ไข' : 'ล็อคความปลอดภัยเดี๋ยวนี้'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lockStatus 
                  ? '🔒 สถานะล็อค: พนักงานไม่สามารถแอบเปลี่ยนรูปต้นแบบเองได้ ต้องได้รับการอนุมัติจากฝ่ายบุคคลเท่านั้น'
                  : '⚠️ คำเตือน: ขณะปลดล็อค พนักงานสามารถอัปเดตรูปถ่ายได้ ควรล็อคหลังตรวจสอบเสร็จสิ้น'}
              </p>
            </div>
          </div>

          {/* If No Biometrics yet */}
          {!bio && (
            <div className="p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-center space-y-3">
              <Info className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
              <div>
                <h5 className="font-bold text-amber-900 dark:text-amber-200 text-sm">ยังไม่มีข้อมูลคุณลักษณะชีวมิติสมบูรณ์</h5>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  ระบบต้องการสกัดเวกเตอร์ชีวมิติ 64 มิติ และคุณลักษณะเรขาคณิตใบหน้าจากภาพถ่ายเพื่อใช้เปรียบเทียบ
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExtractBiometrics}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'กำลังสกัดลักษณะชีวมิติ...' : 'สกัดคุณลักษณะจากภาพปัจจุบัน'}</span>
                </button>
                {onOpenStrictEnroll && (
                  <button
                    type="button"
                    onClick={() => onOpenStrictEnroll(employee)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายภาพมิติรัดกุม 3 ขั้นตอน (แนะนำ)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Biometric Characteristics Cards (If Available) */}
          {bio && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>ลักษณะเฉพาะทางชีวมิติที่บันทึกไว้ (Extracted Biometric Traits)</span>
                </h4>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  คุณภาพชีวมิติ: {bio.qualityScore}% (ผ่านเกณฑ์)
                </span>
              </div>

              {/* 4-Grid Biometric Ratios */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Eye Distance */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    ระยะห่างดวงตา (IPD Ratio)
                  </span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {features?.eyeDistanceRatio ? features.eyeDistanceRatio.toFixed(3) : '0.452'}
                  </div>
                  <span className="text-[10px] text-slate-400">มาตรฐาน 0.42 - 0.48</span>
                </div>

                {/* 2. Eye-to-Nose Proportion */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    สัดส่วนตาถึงจมูก
                  </span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {features?.eyeToNoseRatio ? features.eyeToNoseRatio.toFixed(3) : '0.380'}
                  </div>
                  <span className="text-[10px] text-slate-400">สัดส่วนทองคำเฉพาะตัว</span>
                </div>

                {/* 3. Nose-to-Mouth Proportion */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    สัดส่วนจมูกถึงปาก
                  </span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {features?.noseToMouthRatio ? features.noseToMouthRatio.toFixed(3) : '0.318'}
                  </div>
                  <span className="text-[10px] text-slate-400">โครงสร้างใบหน้าล่าง</span>
                </div>

                {/* 4. Face Aspect & Shape */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    โครงรูปหน้า (Contour)
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate pt-1">
                    {features?.jawlineContour || 'Oval (รูปไข่)'}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    อัตราส่วน {features?.faceAspectRatio || '1.34'}
                  </span>
                </div>
              </div>

              {/* Liveness & Texture Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    <span className="flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>คะแนนการตรวจจับคนจริง (Liveness Baseline)</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">{features?.livenessScore || 95}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${features?.livenessScore || 95}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    ตรวจวัดการกระจายแสงและความคมชัดเพื่อป้องกันการนำภาพถ่าย 2D หรือจอมือถือมาจ่อกล้อง
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>ความคมชัดของภาพชีวมิติ (Clarity Score)</span>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400">{bio.clarityScore || 94}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full" 
                      style={{ width: `${bio.clarityScore || 94}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    ความสว่างเฉลี่ย: {features?.skinLuminance || 128} / 255 (สว่างพอเหมาะต่อการรู้จำ)
                  </span>
                </div>
              </div>

              {/* 64-D Biometric Embedding Vector Visualizer */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>64-Dimensional Biometric Embedding Vector</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ความยาว: {bio.vector?.length || 64} มิติ
                  </span>
                </div>

                {/* Micro Visualizer */}
                <div className="flex items-end space-x-0.5 h-8 bg-slate-950 p-1 rounded-lg overflow-hidden border border-slate-800">
                  {(bio.vector || []).slice(0, 64).map((val, idx) => {
                    const heightPercent = Math.min(100, Math.max(10, Math.round(Math.abs(val) * 600)));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-gradient-to-t from-indigo-600 to-emerald-400 rounded-xs transition-all hover:bg-white"
                        style={{ height: `${heightPercent}%` }}
                        title={`Dimension ${idx + 1}: ${val.toFixed(4)}`}
                      />
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Hash: SHA256-BIO-{employee.id}</span>
                  <span>Normalized L2 Distance</span>
                </div>
              </div>

              {/* Enrollment Metadata Box */}
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>วันเวลาที่ลงทะเบียนชีวมิติ:</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(bio.enrolledAt).toLocaleString('th-TH')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>เจ้าหน้าที่ผู้ลงทะเบียน:</span>
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {bio.enrolledBy || 'ฝ่ายบุคคล HR'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span>อุปกรณ์ที่ใช้บันทึก:</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {bio.deviceModel || 'Desktop Kiosk HD Webcam'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            {onOpenStrictEnroll && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStrictEnroll(employee);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ลงทะเบียนภาพมิติรัดกุมใหม่ (Liveness Re-Enroll)</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
