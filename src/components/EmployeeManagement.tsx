import React, { useState, useRef } from 'react';
import { 
  UserPlus, 
  Users, 
  Camera, 
  Upload, 
  Clock, 
  DollarSign, 
  Building2, 
  Mail, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck,
  CreditCard,
  Plus,
  Pencil,
  X,
  KeyRound,
  Lock,
  Save,
  ScanFace,
  CameraOff,
  Sparkles,
  MapPin,
  MapPinned,
  Compass,
  Globe,
  Navigation,
  Fingerprint,
  Loader2
} from 'lucide-react';
import { Employee, WageType } from '../types';
import { addEmployee, updateEmployee, getCompanySettings } from '../lib/storage';
import { formatCurrency } from '../lib/thaiBahtText';
import { StrictFaceRegistrationModal } from './StrictFaceRegistrationModal';
import { BiometricProfileModal } from './BiometricProfileModal';
import { validateFacePhoto, extractBiometricFromImage, createBiometricProfile } from '../lib/faceDetector';
import { encryptBiometricDescriptor } from '../lib/biometricCrypto';

interface EmployeeManagementProps {
  employees: Employee[];
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees }) => {
  const companySettings = getCompanySettings();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'monthly' | 'daily'>('all');
  const [search, setSearch] = useState('');
  const [strictRegisterTarget, setStrictRegisterTarget] = useState<Employee | null>(null);
  const [selectedBiometricEmp, setSelectedBiometricEmp] = useState<Employee | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Face ID Capture State
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [faceCameraStream, setFaceCameraStream] = useState<MediaStream | null>(null);
  const [faceCameraTarget, setFaceCameraTarget] = useState<'new' | 'edit' | Employee | null>(null);
  const [faceCameraError, setFaceCameraError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editOriginalId, setEditOriginalId] = useState<string>('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Start Camera for capturing Face ID
  const startFaceCamera = async (target: 'new' | 'edit' | Employee) => {
    setFaceCameraTarget(target);
    setFaceCameraOpen(true);
    setFaceCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      setFaceCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera error', err);
      setFaceCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์');
    }
  };

  const stopFaceCamera = () => {
    if (faceCameraStream) {
      faceCameraStream.getTracks().forEach(t => t.stop());
      setFaceCameraStream(null);
    }
    setFaceCameraOpen(false);
    setFaceCameraTarget(null);
  };

  const [isValidatingCameraPhoto, setIsValidatingCameraPhoto] = useState<boolean>(false);

  const captureFaceSnapshot = async () => {
    if (!cameraVideoRef.current || isValidatingCameraPhoto) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth || 640;
    canvas.height = cameraVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(cameraVideoRef.current, 0, 0, canvas.width, canvas.height);
    const snapUrl = canvas.toDataURL('image/jpeg', 0.9);

    setIsValidatingCameraPhoto(true);
    setFaceCameraError(null);

    try {
      const validation = await validateFacePhoto(snapUrl);
      if (!validation.valid || validation.isHandCoveringFace || !validation.hasFace) {
        setIsValidatingCameraPhoto(false);
        setFaceCameraError(`❌ ตรวจไม่ผ่าน: ${validation.reason || 'ตรวจพบมือปิดบังใบหน้า หรือไม่พบใบหน้ามนุษย์ที่เปิดเผยสมบูรณ์ กรุณาเอามือออกจากใบหน้าให้เห็นใบหน้าชัดเจนทั้งสองตา จมูก และปาก'}`);
        return;
      }

      // Generate biometric profile and encrypted descriptors
      const bio = await extractBiometricFromImage(snapUrl);
      const bioProfile = createBiometricProfile(bio, 'ผู้ดูแลระบบถ่ายภาพจากกล้อง (Admin Capture)', true);
      const enc = await encryptBiometricDescriptor(bio.vector);
      bioProfile.descriptorHash = enc.descriptorHash;
      bioProfile.encryptedDescriptor = enc.encryptedDescriptor;
      bioProfile.secureBioHash = enc.secureBioHash;

      if (faceCameraTarget === 'new') {
        setPhotoUrl(snapUrl);
      } else if (faceCameraTarget === 'edit' && editingEmployee) {
        setEditingEmployee({
          ...editingEmployee,
          photoUrl: snapUrl,
          faceDescriptor: bio.vector,
          faceDescriptorHash: enc.descriptorHash,
          encryptedFaceDescriptor: enc.encryptedDescriptor,
          biometricProfile: bioProfile,
        });
      } else if (typeof faceCameraTarget === 'object' && faceCameraTarget !== null) {
        const updatedEmp: Employee = {
          ...faceCameraTarget,
          photoUrl: snapUrl,
          faceDescriptor: bio.vector,
          faceDescriptorHash: enc.descriptorHash,
          encryptedFaceDescriptor: enc.encryptedDescriptor,
          biometricProfile: bioProfile,
        };
        updateEmployee(updatedEmp);
      }
      setIsValidatingCameraPhoto(false);
      stopFaceCamera();
    } catch (err: any) {
      setIsValidatingCameraPhoto(false);
      setFaceCameraError('เกิดข้อผิดพลาดในการตรวจสอบคุณภาพภาพถ่าย กรุณาลองใหม่อีกครั้ง');
    }
  };

  React.useEffect(() => {
    if (cameraVideoRef.current && faceCameraStream) {
      cameraVideoRef.current.srcObject = faceCameraStream;
      cameraVideoRef.current.play().catch(() => {});
    }
  }, [faceCameraStream, faceCameraOpen]);

  // Clean up stream on unmount
  React.useEffect(() => {
    return () => {
      if (faceCameraStream) {
        faceCameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [faceCameraStream]);

  // Form State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('ฝ่ายพัฒนาระบบ');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [passcode, setPasscode] = useState('1234');
  const [wageType, setWageType] = useState<WageType>('monthly');
  const [baseSalary, setBaseSalary] = useState<number>(25000);
  const [otRatePerHour, setOtRatePerHour] = useState<number>(150);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:30');
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState<number>(5);
  const [positionAllowance, setPositionAllowance] = useState<number>(0);
  const [transportAllowance, setTransportAllowance] = useState<number>(1000);
  const [mealAllowance, setMealAllowance] = useState<number>(1000);
  const [diligenceAllowance, setDiligenceAllowance] = useState<number>(1000);
  const [socialSecurity, setSocialSecurity] = useState(true);
  const [withholdingTaxRate, setWithholdingTaxRate] = useState<number>(1);
  const [allowedLocationIds, setAllowedLocationIds] = useState<string[]>(['all']);
  const [allowOffsiteCheckin, setAllowOffsiteCheckin] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );
  const [isPhotoUploading, setIsPhotoUploading] = useState<boolean>(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setIsPhotoUploading(true);
        try {
          const validation = await validateFacePhoto(dataUrl);
          if (!validation.valid || validation.isHandCoveringFace || !validation.hasFace) {
            setIsPhotoUploading(false);
            alert(`❌ ภาพนี้ตรวจไม่ผ่าน: ${validation.reason || 'ตรวจพบมือปิดบังใบหน้า หรือไม่พบใบหน้ามนุษย์ที่เปิดเผยสมบูรณ์ กรุณาเลือกภาพที่เห็นใบหน้าเต็มชัดเจน'}`);
            return;
          }
          setPhotoUrl(dataUrl);
        } catch {
          setPhotoUrl(dataUrl);
        } finally {
          setIsPhotoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalaryChange = (val: number, type: WageType) => {
    setBaseSalary(val);
    // Auto-calculate suggested OT rate (1.5x)
    if (type === 'monthly') {
      const hourly = val / (26 * 8);
      setOtRatePerHour(Math.round(hourly * 1.5));
    } else if (type === 'daily') {
      const hourly = val / 8;
      setOtRatePerHour(Math.round(hourly * 1.5));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !position) {
      alert('กรุณากรอกข้อมูลพนักงานให้ครบถ้วน');
      return;
    }

    const newId = `EMP-${1000 + employees.length + 1}`;

    const newEmp: Employee = {
      id: newId,
      name,
      nickname,
      department,
      position,
      email,
      phone: phone || '081-000-0000',
      idCard: idCard || '1-1000-00000-00-0',
      photoUrl,
      wageType,
      baseSalary: Number(baseSalary),
      otRatePerHour: Number(otRatePerHour),
      shift: {
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes),
        workDaysPerWeek: Number(workDaysPerWeek),
      },
      allowances: {
        position: Number(positionAllowance),
        transport: Number(transportAllowance),
        meal: Number(mealAllowance),
        diligence: Number(diligenceAllowance),
        other: 0,
      },
      socialSecurity,
      withholdingTaxRate: Number(withholdingTaxRate),
      passcode: passcode.trim() || '1234',
      allowedLocationIds,
      allowOffsiteCheckin,
      // MANDATORY: Defaults to pending accountant approval!
      approvalStatus: 'pending_accountant',
      registeredAt: new Date().toISOString(),
      isActive: true,
    };

    addEmployee(newEmp);
    alert(`ลงทะเบียนพนักงาน [${name}] สำเร็จ!\nระบบได้ส่งเรื่องไปยังฝ่ายบัญชีเพื่อตรวจสอบและอนุมัติก่อนเปิดสิทธิ์การสแกนหน้าเข้างาน`);
    setShowAddForm(false);
  };

  const filtered = employees.filter(emp => {
    const matchTab = activeTab === 'all' ? true : emp.wageType === activeTab;
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
                        emp.department.toLowerCase().includes(search.toLowerCase()) ||
                        emp.id.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>จัดการทะเบียนพนักงาน & กำหนดเวลากะและค่าจ้าง</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            แอดมินบันทึกข้อมูลใบหน้า กะเวลาเข้า-ออกงาน และอัตราเงินเดือน โดยต้องรอการยืนยันจากฝ่ายบัญชีก่อนจึงจะสแกนหน้าได้
          </p>
        </div>

        <button
          id="btn-open-add-employee"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          {showAddForm ? (
            <span>ปิดฟอร์มลงทะเบียน</span>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>ลงทะเบียนพนักงานใหม่</span>
            </>
          )}
        </button>
      </div>

      {/* Registration Form Modal / Panel */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-blue-200 dark:border-slate-800 shadow-md mb-8 animate-in fade-in transition-colors">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                +
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ฟอร์มลงทะเบียนพนักงานและข้อมูลใบหน้า</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  กรอกข้อมูลอัตราจ้าง กะเวลาทำงานเฉพาะบุคคล และรูปถ่ายใบหน้า
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>ส่งต่อไปยังฝ่ายบัญชีเพื่ออนุมัติ</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Photo capture & preview */}
            <div className="md:col-span-4 flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">รูปถ่ายใบหน้าสำหรับสแกน (Face ID)</span>
              <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-dashed border-blue-400 dark:border-blue-500 relative shadow-inner bg-slate-200 dark:bg-slate-700 flex items-center justify-center group">
                <img src={photoUrl} alt="Employee Face Preview" className="w-full h-full object-cover" />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs cursor-pointer p-2 text-center"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span>เปลี่ยนรูปถ่าย</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center space-x-2 mt-3 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูป</span>
                </button>

                <button
                  type="button"
                  onClick={() => startFaceCamera('new')}
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>ถ่ายกล้องสด</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-2 leading-tight">
                แนะนำให้ใช้รูปหน้าตรง มองกล้อง แสงสว่างชัดเจน ไม่สวมแว่นตาดำหรือหน้ากาก
              </p>
            </div>

            {/* Right Information inputs */}
            <div className="md:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น นายธนากร มีสุข"
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="เช่น กอล์ฟ"
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">แผนก / ฝ่ายงาน *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ฝ่ายพัฒนาระบบ (Software Eng.)">ฝ่ายพัฒนาระบบ (Software Eng.)</option>
                    <option value="ฝ่ายการตลาดดิจิทัล (Marketing)">ฝ่ายการตลาดดิจิทัล (Marketing)</option>
                    <option value="ฝ่ายประสานงานคลังสินค้า (Logistics)">ฝ่ายประสานงานคลังสินค้า (Logistics)</option>
                    <option value="ฝ่ายบริการเทคนิคและซ่อมบำรุง">ฝ่ายบริการเทคนิคและซ่อมบำรุง</option>
                    <option value="ฝ่ายบัญชีและการเงิน (Accounting)">ฝ่ายบัญชีและการเงิน (Accounting)</option>
                    <option value="ฝ่ายบุคคลและธุรการ (HR)">ฝ่ายบุคคลและธุรการ (HR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ตำแหน่งงาน *</label>
                  <input
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="เช่น เจ้าหน้าที่เทคนิค"
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">อีเมล (สำหรับส่งสลิปเงินเดือน A4) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="somchai@company.co.th"
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081-234-5678"
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสผ่านเข้าแอปสำหรับพนักงาน (App Passcode) *
                  </label>
                  <input
                    type="text"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="1234"
                    className="w-full text-xs px-3 py-2 border border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/40 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono tracking-wider font-bold text-blue-900 dark:text-blue-200"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    เจ้าหน้าที่กำหนดให้พนักงานใช้ลงชื่อเข้าใช้คู่กับรหัสพนักงาน
                  </p>
                </div>
              </div>

              {/* Wage & Shift Configuration */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5 flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>โครงสร้างค่าจ้างและการทำงาน (กำหนดแยกเฉพาะบุคคล)</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">ประเภทการจ้าง</label>
                    <select
                      value={wageType}
                      onChange={(e) => {
                        const val = e.target.value as WageType;
                        setWageType(val);
                        handleSalaryChange(val === 'daily' ? 600 : 25000, val);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="monthly">พนักงานรายเดือน</option>
                      <option value="daily">พนักงานรายวัน</option>
                      <option value="hourly">พนักงานรายชั่วโมง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      {wageType === 'monthly' ? 'เงินเดือนพื้นฐาน (บาท)' : 'ค่าจ้างต่อวัน (บาท)'}
                    </label>
                    <input
                      type="number"
                      required
                      value={baseSalary}
                      onChange={(e) => handleSalaryChange(Number(e.target.value), wageType)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">อัตรา OT (บาท/ชม.)</label>
                    <input
                      type="number"
                      value={otRatePerHour}
                      onChange={(e) => setOtRatePerHour(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Shift Settings */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">เวลาเข้างานกะนี้</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">เวลาออกงานกะนี้</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">ผ่อนผันสาย (นาที)</label>
                    <input
                      type="number"
                      value={graceMinutes}
                      onChange={(e) => setGraceMinutes(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Allowances */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ค่าตำแหน่ง</label>
                  <input
                    type="number"
                    value={positionAllowance}
                    onChange={(e) => setPositionAllowance(Number(e.target.value))}
                    className="w-full text-xs px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">ค่าเดินทาง</label>
                  <input
                    type="number"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(Number(e.target.value))}
                    className="w-full text-xs px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">เบี้ยเลี้ยง/อาหาร</label>
                  <input
                    type="number"
                    value={mealAllowance}
                    onChange={(e) => setMealAllowance(Number(e.target.value))}
                    className="w-full text-xs px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">เบี้ยขยัน</label>
                  <input
                    type="number"
                    value={diligenceAllowance}
                    onChange={(e) => setDiligenceAllowance(Number(e.target.value))}
                    className="w-full text-xs px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Locations & GPS Geofence Permission */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPinned className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  สิทธิ์สถานที่สแกนเข้า-ออกงาน & พิกัด GPS (Work Locations & Geofence)
                </span>
              </div>
              {companySettings.enableGpsVerification ? (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  ระบบเปิด Geofence อยู่
                </span>
              ) : (
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  ระบบบริษัทไม่ได้บังคับ GPS
                </span>
              )}
            </div>

            {/* Offsite Checkbox */}
            <div className="flex items-start space-x-2.5 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                id="add-emp-offsite"
                type="checkbox"
                checked={allowOffsiteCheckin}
                onChange={(e) => setAllowOffsiteCheckin(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
              />
              <label htmlFor="add-emp-offsite" className="text-xs cursor-pointer">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>อนุญาตให้ลงเวลานอกสถานที่ได้ (Off-site / WFH / Field Sales)</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  สำหรับพนักงานขาย, ช่างบริการ, จัดส่ง หรือ WFH ระบบจะไม่ปฏิเสธการลงเวลาเมื่ออยู่นอกออฟฟิศ แต่จะบันทึกพิกัดจริงขณะสแกนไว้ตรวจสอบ
                </span>
              </label>
            </div>

            {!allowOffsiteCheckin && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  กำหนดพื้นที่หรือสาขาที่อนุญาตให้พนักงานสแกนหน้าได้:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* All Locations option */}
                  <label className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-colors ${
                    allowedLocationIds.includes('all')
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={allowedLocationIds.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAllowedLocationIds(['all']);
                        } else {
                          setAllowedLocationIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs">ทุกสาขา / ทุกสถานที่ของบริษัท ({companySettings.workLocations?.length || 0} แห่ง)</span>
                  </label>

                  {/* Specific Location checkboxes */}
                  {(companySettings.workLocations || []).map((loc) => {
                    const isChecked = allowedLocationIds.includes('all') || allowedLocationIds.includes(loc.id);
                    return (
                      <label
                        key={loc.id}
                        className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={allowedLocationIds.includes('all')}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedLocationIds([...allowedLocationIds.filter(id => id !== 'all'), loc.id]);
                            } else {
                              setAllowedLocationIds(allowedLocationIds.filter(id => id !== loc.id && id !== 'all'));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="text-xs">
                          <span className="font-bold block leading-tight">{loc.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            รัศมี {loc.radiusMeters} ม.
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>พนักงานใหม่จะยังสแกนหน้าไม่ได้จนกว่าฝ่ายบัญชีจะตรวจสอบและกดยืนยัน</span>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>บันทึกและส่งเรื่องให้ฝ่ายบัญชี</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Employees Table Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              พนักงานทั้งหมด ({employees.length})
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                activeTab === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                activeTab === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              รายวัน
            </button>
          </div>

          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน หรือแผนก..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg w-full sm:w-64 placeholder-slate-400"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">พนักงาน</th>
                <th className="px-4 py-3">แผนก / ตำแหน่ง</th>
                <th className="px-4 py-3">เวลากะทำงาน</th>
                <th className="px-4 py-3">ค่าจ้าง / OT</th>
                <th className="px-4 py-3">สถานะอนุมัติจากบัญชี</th>
                <th className="px-4 py-3 text-right">อีเมลรับสลิป</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((emp, idx) => {
                const isApproved = emp.approvalStatus === 'approved';

                return (
                  <tr key={`${emp.id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={emp.photoUrl}
                          alt={emp.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span>{emp.id} ({emp.nickname})</span>
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px] font-semibold">
                              PIN: {emp.passcode || '1234'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{emp.department}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{emp.position}</div>
                      <div className="mt-1">
                        {emp.allowOffsiteCheckin ? (
                          <span className="inline-flex items-center text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-medium border border-indigo-200 dark:border-indigo-800">
                            <Globe className="w-2.5 h-2.5 mr-1 text-indigo-500" />
                            นอกสถานที่ได้ (Off-site)
                          </span>
                        ) : !emp.allowedLocationIds || emp.allowedLocationIds.includes('all') ? (
                          <span className="inline-flex items-center text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-medium">
                            <MapPin className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                            ทุกสาขา ({companySettings.workLocations?.length || 0})
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">
                            <MapPin className="w-2.5 h-2.5 mr-1 text-blue-500" />
                            {emp.allowedLocationIds.length} สาขาที่กำหนด
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {emp.shift.startTime} - {emp.shift.endTime} น.
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        ผ่อนผัน {emp.shift.graceMinutes} นาที ({emp.shift.workDaysPerWeek} วัน/สัปดาห์)
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(emp.baseSalary)} ฿
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1">
                          ({emp.wageType === 'monthly' ? 'เดือน' : 'วัน'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        OT {emp.otRatePerHour} ฿/ชม.
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {isApproved ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-500 dark:text-emerald-400" />
                          อนุมัติแล้ว (สแกนได้)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-full animate-pulse">
                          <AlertCircle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
                          รออนุมัติโดยบัญชี
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {emp.email}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedBiometricEmp(emp)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer"
                        title="ดูและตรวจสอบคุณลักษณะชีวมิติใบหน้า (Biometric Profile & Lock)"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>ชีวมิติ {emp.biometricProfile?.isLocked ? '🔒' : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => startFaceCamera(emp)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
                        title="ถ่ายภาพใบหน้า Face ID ใหม่ด้วยกล้องสด"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>ถ่าย Face ID</span>
                      </button>

                      <button
                        id={`btn-edit-emp-${emp.id}`}
                        type="button"
                        onClick={() => {
                          setEditingEmployee({ ...emp });
                          setEditOriginalId(emp.id);
                          setEditSuccessMsg(null);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขข้อมูล / รหัสผ่าน / รหัสพนักงาน"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    แก้ไขข้อมูลพนักงาน & รหัสผ่าน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เปลี่ยนรหัสพนักงาน (EMP), รหัสผ่าน PIN, หรือข้อมูลตำแหน่งค่าจ้าง
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingEmployee.id.trim()) {
                  alert('กรุณาระบุรหัสพนักงาน');
                  return;
                }
                updateEmployee(editingEmployee, editOriginalId);
                setEditSuccessMsg('บันทึกการแก้ไขข้อมูลและรหัสผ่านเรียบร้อยแล้ว!');
                setTimeout(() => {
                  setEditingEmployee(null);
                }, 1000);
              }}
              className="space-y-4 text-xs"
            >
              {/* Photo & Biometric Face ID Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={editingEmployee.photoUrl}
                  alt={editingEmployee.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-sm shrink-0"
                />
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start space-x-1.5">
                    <ScanFace className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>รูปถ่ายสแกนใบหน้า Face ID ปัจจุบัน</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ใช้เปรียบเทียบโครงหน้าเมื่อพนักงานสแกนผ่านกล้องมือถือหรือตู้คีออส
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingEmployee({ ...editingEmployee, photoUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startFaceCamera('edit')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายกล้องสด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrictRegisterTarget(editingEmployee)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                    title="ลงทะเบียนใบหน้าชีวมิติรัดกุม 3 ขั้นตอนป้องกันการสแกนแทนกัน"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>ลงทะเบียนมิติรัดกุม (Liveness)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBiometricEmp(editingEmployee)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                    title="ดูคุณลักษณะชีวมิติเรขาคณิตใบหน้าและสถานะล็อคความปลอดภัย"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-indigo-300" />
                    <span>ข้อมูลชีวมิติ {editingEmployee.biometricProfile?.isLocked ? '🔒' : ''}</span>
                  </button>
                </div>
              </div>

              {/* EMP ID & Passcode Highlight Box */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3">
                <div className="font-bold text-indigo-950 dark:text-indigo-200 text-xs flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>การระบุตัวตน & รหัสเข้าสู่ระบบ (Identification & Login Credentials)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      รหัสพนักงาน (Employee ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingEmployee.id}
                      onChange={(e) =>
                        setEditingEmployee({ ...editingEmployee, id: e.target.value.toUpperCase() })
                      }
                      placeholder="เช่น EMP-1001"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      สามารถเปลี่ยนเป็นรหัสใหม่ได้ (ระบบจะโอนประวัติสแกนเวลาและสลิปให้)
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      รหัสผ่าน / PIN เข้าใช้งานแอป (Passcode) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingEmployee.passcode || '1234'}
                      onChange={(e) =>
                        setEditingEmployee({ ...editingEmployee, passcode: e.target.value })
                      }
                      placeholder="เช่น 1234"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 tracking-wider"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      กำหนดรหัส 4 หลักเพื่อให้พนักงานใช้ลงชื่อเข้าแอปในเครื่องตนเอง
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.name}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={editingEmployee.nickname || ''}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, nickname: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">แผนก / สังกัด *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.department}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ตำแหน่งงาน *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.position}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, position: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Wage Type & Base Salary & OT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทค่าจ้าง</label>
                  <select
                    value={editingEmployee.wageType}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, wageType: e.target.value as WageType })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="monthly">รายเดือน (Monthly)</option>
                    <option value="daily">รายวัน (Daily)</option>
                    <option value="hourly">รายชั่วโมง (Hourly)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editingEmployee.wageType === 'monthly' ? 'เงินเดือนพื้นฐาน (บาท)' : 'ค่าจ้างต่อวัน (บาท)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingEmployee.baseSalary}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, baseSalary: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">อัตราค่าล่วงเวลา OT (บาท/ชม.)</label>
                  <input
                    type="number"
                    value={editingEmployee.otRatePerHour}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, otRatePerHour: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">อีเมลรับสลิปเงินเดือน *</label>
                  <input
                    type="email"
                    required
                    value={editingEmployee.email}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={editingEmployee.phone}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Shift Hours */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เวลาเข้ากะ</label>
                  <input
                    type="time"
                    value={editingEmployee.shift?.startTime || '08:30'}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        shift: { ...editingEmployee.shift, startTime: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เวลาออกกะ</label>
                  <input
                    type="time"
                    value={editingEmployee.shift?.endTime || '17:30'}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        shift: { ...editingEmployee.shift, endTime: e.target.value },
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ผ่อนผันสาย (นาที)</label>
                  <input
                    type="number"
                    value={editingEmployee.shift?.graceMinutes ?? 15}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        shift: { ...editingEmployee.shift, graceMinutes: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Social Security individual checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="emp-edit-sso"
                  type="checkbox"
                  checked={editingEmployee.socialSecurity}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, socialSecurity: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="emp-edit-sso" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  เข้าเงื่อนไขการหักเงินสมทบประกันสังคมรายบุคคล (หากบริษัทเปิดใช้งาน ปกส.)
                </label>
              </div>

              {/* Work Locations & GPS Geofence Permission */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPinned className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      สิทธิ์สถานที่สแกนเข้า-ออกงาน & พิกัด GPS
                    </span>
                  </div>
                  {companySettings.enableGpsVerification ? (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                      ระบบเปิด Geofence อยู่
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                      ระบบไม่ได้บังคับ GPS
                    </span>
                  )}
                </div>

                {/* Offsite Checkbox */}
                <div className="flex items-start space-x-2.5 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    id="edit-emp-offsite"
                    type="checkbox"
                    checked={editingEmployee.allowOffsiteCheckin ?? false}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        allowOffsiteCheckin: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="edit-emp-offsite" className="text-xs cursor-pointer">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>อนุญาตให้ลงเวลานอกสถานที่ได้ (Off-site / WFH / Field Sales)</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      ระบบจะไม่บล็อกเมื่ออยู่นอกรัศมีออฟฟิศ แต่จะบันทึกพิกัดจริงเพื่อการตรวจสอบ
                    </span>
                  </label>
                </div>

                {!editingEmployee.allowOffsiteCheckin && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      พื้นที่หรือสาขาที่อนุญาตให้พนักงานสแกนหน้าได้:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* All locations option */}
                      <label className={`p-2 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-colors ${
                        !editingEmployee.allowedLocationIds || editingEmployee.allowedLocationIds.includes('all')
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100 font-bold'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={!editingEmployee.allowedLocationIds || editingEmployee.allowedLocationIds.includes('all')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingEmployee({
                                ...editingEmployee,
                                allowedLocationIds: ['all'],
                              });
                            } else {
                              setEditingEmployee({
                                ...editingEmployee,
                                allowedLocationIds: [],
                              });
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs">ทุกสาขา / ทุกสถานที่ของบริษัท ({companySettings.workLocations?.length || 0} แห่ง)</span>
                      </label>

                      {/* Specific Location checkboxes */}
                      {(companySettings.workLocations || []).map((loc) => {
                        const isAll = !editingEmployee.allowedLocationIds || editingEmployee.allowedLocationIds.includes('all');
                        const isChecked = isAll || (editingEmployee.allowedLocationIds || []).includes(loc.id);
                        return (
                          <label
                            key={loc.id}
                            className={`p-2 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isAll}
                              checked={isChecked}
                              onChange={(e) => {
                                const current = (editingEmployee.allowedLocationIds || []).filter(id => id !== 'all');
                                if (e.target.checked) {
                                  setEditingEmployee({
                                    ...editingEmployee,
                                    allowedLocationIds: [...current, loc.id],
                                  });
                                } else {
                                  setEditingEmployee({
                                    ...editingEmployee,
                                    allowedLocationIds: current.filter(id => id !== loc.id),
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                            />
                            <div className="text-xs">
                              <span className="font-bold block leading-tight">{loc.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                รัศมี {loc.radiusMeters} ม.
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face ID Live Camera Modal */}
      {faceCameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ScanFace className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    ถ่ายภาพบันทึก Face ID
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {typeof faceCameraTarget === 'object' && faceCameraTarget !== null
                      ? `พนักงาน: ${faceCameraTarget.name} (${faceCameraTarget.id})`
                      : 'จัดวางใบหน้าให้อยู่ในกรอบวงรี'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopFaceCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-blue-500/50 shadow-inner flex items-center justify-center">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Oval Face Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[68%] h-[82%] rounded-[50%] border-2 border-dashed border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col items-center justify-between py-4">
                  <span className="text-[10px] font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full">
                    จัดใบหน้าให้อยู่ในกรอบ
                  </span>
                  <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-full">
                    มองตรง แสงสว่างเพียงพอ
                  </span>
                </div>
              </div>

              {faceCameraError && (
                <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center">
                  <CameraOff className="w-10 h-10 text-red-500 mb-2" />
                  <p className="text-xs text-red-400">{faceCameraError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={stopFaceCamera}
                className="flex-1 py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={captureFaceSnapshot}
                disabled={isValidatingCameraPhoto}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isValidatingCameraPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังตรวจสอบชีวมิติ...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>ถ่ายภาพและบันทึก</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Face Registration Modal for Admin */}
      <StrictFaceRegistrationModal
        isOpen={!!strictRegisterTarget}
        onClose={() => setStrictRegisterTarget(null)}
        employee={strictRegisterTarget}
        requirePasscode={false}
        onSuccess={(updatedEmp) => {
          updateEmployee(updatedEmp);
          if (editingEmployee && editingEmployee.id === updatedEmp.id) {
            setEditingEmployee(updatedEmp);
          }
          setStrictRegisterTarget(null);
          setEditSuccessMsg(`ลงทะเบียนใบหน้าชีวมิติมิติรัดกุมสำหรับ คุณ${updatedEmp.name} เรียบร้อยแล้ว`);
        }}
      />

      {/* Biometric Profile Inspector & Lock Modal */}
      <BiometricProfileModal
        isOpen={!!selectedBiometricEmp}
        onClose={() => setSelectedBiometricEmp(null)}
        employee={selectedBiometricEmp}
        onOpenStrictEnroll={(emp) => {
          setSelectedBiometricEmp(null);
          setStrictRegisterTarget(emp);
        }}
      />
    </div>
  );
};
