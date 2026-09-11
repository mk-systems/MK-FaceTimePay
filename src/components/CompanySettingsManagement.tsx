import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  Clock, 
  DollarSign, 
  ReceiptText, 
  FolderSync,
  HelpCircle,
  Eye,
  Sliders,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  ImageOff,
  Sun,
  Moon,
  Laptop,
  Palette,
  Navigation,
  Compass,
  Plus,
  Edit2,
  ExternalLink,
  LocateFixed,
  MapPinned,
  Check,
  X
} from 'lucide-react';
import { CompanySettings, ThemeMode, WorkLocation } from '../types';
import { initialWorkLocations } from '../data/initialData';
import { saveCompanySettings } from '../lib/storage';
import { setStoredThemePreference, applyThemeToDOM, resolveEffectiveTheme } from '../lib/theme';
import { calculateDistanceMeters } from '../lib/faceDetector';

interface CompanySettingsManagementProps {
  settings: CompanySettings;
  onSettingsSaved?: (newSettings: CompanySettings) => void;
  onSettingsUpdated?: (newSettings: CompanySettings) => void;
}

export const CompanySettingsManagement: React.FC<CompanySettingsManagementProps> = ({
  settings,
  onSettingsSaved,
  onSettingsUpdated,
}) => {
  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    enableSocialSecurity: settings.enableSocialSecurity !== false,
    socialSecurityRate: settings.socialSecurityRate ?? 5,
    socialSecurityMaxBase: settings.socialSecurityMaxBase ?? 15000,
    enableWithholdingTax: settings.enableWithholdingTax !== false,
    enableLogo: settings.enableLogo === true,
    logoUrl: settings.logoUrl || '',
    themeMode: settings.themeMode || 'auto',
    website: settings.website || 'www.dis-thailand.com',
    enableGpsVerification: settings.enableGpsVerification !== false,
    maxAllowedRadiusMeters: 100,
    workLocations: Array.isArray(settings.workLocations) && settings.workLocations.length > 0
      ? settings.workLocations.map(loc => ({
          ...loc,
          radiusMeters: Math.min(100, loc.radiusMeters || 100)
        }))
      : initialWorkLocations,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Work Locations Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<Omit<WorkLocation, 'id'>>({
    name: '',
    address: '',
    latitude: 13.736717,
    longitude: 100.561081,
    radiusMeters: 100,
    isActive: true,
    notes: '',
  });
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Staff Live GPS Distance Tester State
  const [staffLiveGps, setStaffLiveGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [isTestingLiveGps, setIsTestingLiveGps] = useState(false);
  const [testGpsError, setTestGpsError] = useState<string | null>(null);

  const handleTestStaffLiveGps = () => {
    if (!('geolocation' in navigator)) {
      setTestGpsError('เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsTestingLiveGps(true);
    setTestGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStaffLiveGps({
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toLocaleTimeString('th-TH'),
        });
        setIsTestingLiveGps(false);
      },
      (err) => {
        setIsTestingLiveGps(false);
        setTestGpsError(`ไม่สามารถดึงตำแหน่ง GPS ได้ (${err.message}) กรุณาอนุญาต Location บนเบราว์เซอร์หรืออุปกรณ์`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenAddLocation = () => {
    setEditingLocationId(null);
    setLocationForm({
      name: '',
      address: '',
      latitude: 13.736717,
      longitude: 100.561081,
      radiusMeters: 100,
      isActive: true,
      notes: '',
    });
    setGpsError(null);
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocation = (loc: WorkLocation) => {
    setEditingLocationId(loc.id);
    setLocationForm({
      name: loc.name,
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: Math.min(100, loc.radiusMeters || 100),
      isActive: loc.isActive,
      notes: loc.notes || '',
    });
    setGpsError(null);
    setIsLocationModalOpen(true);
  };

  const handleGetCurrentGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsGettingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm((prev) => ({
          ...prev,
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
        }));
        setIsGettingGps(false);
      },
      (err) => {
        setIsGettingGps(false);
        setGpsError(`ไม่สามารถดึงตำแหน่ง GPS ได้ (${err.message}) กรุณาอนุญาต Location บนเบราว์เซอร์`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.name.trim()) {
      alert('กรุณากรอกชื่อสถานที่หรือสาขา');
      return;
    }

    const currentLocs = formData.workLocations || [];
    const sanitizedRadius = Math.min(100, Math.max(10, locationForm.radiusMeters || 100));
    const sanitizedForm = {
      ...locationForm,
      radiusMeters: sanitizedRadius,
    };

    if (editingLocationId) {
      const updated = currentLocs.map((loc) =>
        loc.id === editingLocationId
          ? { ...loc, ...sanitizedForm }
          : loc
      );
      setFormData((prev) => ({ ...prev, workLocations: updated }));
    } else {
      const newLoc: WorkLocation = {
        id: `LOC-${Date.now().toString().slice(-4)}`,
        ...sanitizedForm,
      };
      setFormData((prev) => ({ ...prev, workLocations: [...currentLocs, newLoc] }));
    }
    setIsLocationModalOpen(false);
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสถานที่ปฏิบัติงานนี้ออกจากระบบ?')) {
      const updated = (formData.workLocations || []).filter((loc) => loc.id !== id);
      setFormData((prev) => ({ ...prev, workLocations: updated }));
    }
  };

  const handleToggleLocationActive = (id: string) => {
    const updated = (formData.workLocations || []).map((loc) =>
      loc.id === id ? { ...loc, isActive: !loc.isActive } : loc
    );
    setFormData((prev) => ({ ...prev, workLocations: updated }));
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setFormData((prev) => ({ ...prev, themeMode: mode }));
    // Immediately apply live preview
    const eff = resolveEffectiveTheme(mode);
    applyThemeToDOM(eff);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพต้องไม่เกิน 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: base64,
          enableLogo: true,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      enableLogo: false,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanySettings(formData);
    if (onSettingsSaved) onSettingsSaved(formData);
    if (onSettingsUpdated) onSettingsUpdated(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-['Sarabun',sans-serif]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center space-x-2">
              <span>ปรับปรุงข้อมูลองค์กร & ตั้งค่าประกันสังคม</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-sans">
                Official Profile
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              ปรับปรุงชื่อ ที่อยู่นิติบุคคลสำหรับหัวสลิปเงินเดือน A4 และเปิด-ปิดระบบประกันสังคมตามโครงสร้างองค์กรจริง
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl text-xs font-semibold animate-in fade-in zoom-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>บันทึกข้อมูลเรียบร้อยแล้ว</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: ข้อมูลนิติบุคคล / ที่อยู่บริษัท */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                1. ข้อมูลนิติบุคคลและที่อยู่ (แสดงบนหัวสลิปเงินเดือน A4)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อบริษัท / องค์กร (ภาษาไทย) *
                </label>
                <input
                  id="input-company-name-th"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="เช่น บริษัท ดิจิทัล อินโนเวชั่น ซิสเต็มส์ จำกัด"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อบริษัท (ภาษาอังกฤษ) *
                </label>
                <input
                  id="input-company-name-en"
                  type="text"
                  required
                  value={formData.companyNameEn}
                  onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                  placeholder="e.g. Digital Innovation Systems Co., Ltd."
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เลขประจำตัวผู้เสียภาษีอากร 13 หลัก (Tax ID) *
                </label>
                <input
                  id="input-tax-id"
                  type="text"
                  required
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="0105562089456"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรศัพท์ติดต่อสำนักงาน *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-company-phone"
                    type="text"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="02-789-4560"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมลทางการฝ่ายบุคคล / บัญชี *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-company-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hr-payroll@dis-thailand.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เว็บไซต์บริษัท
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-company-website"
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.dis-thailand.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่สำนักงานใหญ่ / สาขา (Registered Address) *
                </label>
                <div className="relative">
                  <textarea
                    id="input-company-address"
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="เลขที่ อาคาร ชั้น ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    className="w-full text-xs p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: โลโก้บริษัท & การแสดงผลบนสลิปเงินเดือน A4 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  2. โลโก้บริษัท & การแสดงผลบนสลิปเงินเดือน A4
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  อัปโหลดโลโก้องค์กร หรือสามารถปิดฟังก์ชันนี้ได้หากบริษัทไม่มีโลโก้ (เมื่อทำสลิปออกมาจะไม่ใส่รูปภาพลงไป)
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Logo Toggle Switch Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  formData.enableLogo
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {formData.enableLogo
                          ? '✓ เปิดแสดงโลโก้บริษัทบนสลิปเงินเดือน A4'
                          : '✕ ปิดฟังก์ชันโลโก้ (ไม่มีโลโก้ / ไม่ใส่รูปภาพบนสลิป A4)'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          formData.enableLogo
                            ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {formData.enableLogo ? 'แสดงโลโก้' : 'ปิดการแสดงรูป'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {formData.enableLogo
                        ? 'โลโก้ที่อัปโหลดจะถูกนำไปพิมพ์อยู่ด้านซ้ายของชื่อบริษัทบนหัวสลิปเงินเดือน A4 อย่างสวยงาม'
                        : 'สำหรับบริษัทที่ไม่มีโลโก้ หรือไม่ต้องการให้มีรูปภาพบนเอกสาร ระบบจะตัดรูปภาพออกทั้งหมด และพิมพ์เฉพาะชื่อบริษัทตัวหนังสือทางการ'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      id="toggle-company-logo"
                      type="checkbox"
                      checked={formData.enableLogo}
                      onChange={(e) =>
                        setFormData({ ...formData, enableLogo: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Logo Upload / Preview Box (Active when enableLogo is true) */}
              {formData.enableLogo && (
                <div className="p-4 border border-dashed border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800/60 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Current Logo Preview */}
                    <div className="flex items-center space-x-4">
                      {formData.logoUrl ? (
                        <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                          <img
                            src={formData.logoUrl}
                            alt="Company Logo Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <ImageOff className="w-6 h-6 mb-1" />
                          <span className="text-[10px]">ยังไม่มีรูป</span>
                        </div>
                      )}

                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {formData.logoUrl ? 'โลโก้ที่ใช้งานปัจจุบัน' : 'ยังไม่ได้เลือกไฟล์ภาพโลโก้'}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          รองรับไฟล์ PNG, JPG, JPEG, SVG หรือ WebP (ขนาดแนะนำไม่เกิน 2MB)
                        </p>
                        {formData.logoUrl && (
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="px-2.5 py-1 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center space-x-1 border border-red-200 dark:border-red-900/50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>ลบรูปภาพ</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      <label
                        htmlFor="file-upload-logo"
                        className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{formData.logoUrl ? 'เปลี่ยนรูปภาพโลโก้ใหม่' : 'อัปโหลดรูปภาพโลโก้บริษัท'}</span>
                      </label>
                      <input
                        id="file-upload-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!formData.enableLogo && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <ImageOff className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    ฟังก์ชันรูปภาพโลโก้ถูกปิดอยู่ เมื่อพิมพ์หรือทำสลิปเงินเดือน A4 จะไม่มีรูปภาพใดๆ ปรากฏบนเอกสาร
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: ตั้งค่าประกันสังคม และ ภาษีหัก ณ ที่จ่าย */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  3. การตั้งค่าระบบประกันสังคม และภาษีหัก ณ ที่จ่าย
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ปรับปรุงเงื่อนไขสิทธิประโยชน์ให้ตรงกับองค์กรจริง กรณีบริษัทไม่มีประกันสังคมให้พนักงาน
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Social Security Big Toggle Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  formData.enableSocialSecurity
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-800/60'
                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-1 ring-amber-200 dark:ring-amber-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {formData.enableSocialSecurity
                          ? '✓ บริษัทมีระบบประกันสังคมให้พนักงาน'
                          : '✕ บริษัทไม่มีระบบประกันสังคมให้พนักงาน (ไม่หัก ปกส.)'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          formData.enableSocialSecurity
                            ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                            : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        {formData.enableSocialSecurity ? 'เปิดหัก ปกส.' : 'ปิดการหัก (0.00 บาท)'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      {formData.enableSocialSecurity
                        ? 'ระบบจะคำนวณหักเงินสมทบประกันสังคมจากเงินเดือนพนักงาน 5% สูงสุดไม่เกิน 750 บาท/เดือน และแสดงในช่องเงินสมทบประกันสังคมบนสลิปเงินเดือน'
                        : 'กรณีบริษัทเพิ่งเริ่มจัดตั้ง หรือไม่มีประกันสังคมให้พนักงาน ระบบจะระงับการหักเงินสมทบประกันสังคมเป็น 0.00 บาท บนสลิปเงินเดือนทุกฉบับทันที'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      id="toggle-social-security"
                      type="checkbox"
                      checked={formData.enableSocialSecurity}
                      onChange={(e) =>
                        setFormData({ ...formData, enableSocialSecurity: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Sub-inputs if Social Security is Enabled */}
                {formData.enableSocialSecurity && (
                  <div className="mt-4 pt-4 border-t border-emerald-200/80 dark:border-emerald-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        อัตราเงินสมทบ ปกส. (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={formData.socialSecurityRate}
                        onChange={(e) =>
                          setFormData({ ...formData, socialSecurityRate: parseFloat(e.target.value) || 5 })
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">อัตรามาตรฐานตามกฎหมาย: 5%</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        เพดานฐานเงินเดือนคำนวณ ปกส. (บาท)
                      </label>
                      <input
                        type="number"
                        min="5000"
                        max="30000"
                        step="1000"
                        value={formData.socialSecurityMaxBase}
                        onChange={(e) =>
                          setFormData({ ...formData, socialSecurityMaxBase: parseInt(e.target.value) || 15000 })
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">เพดานสูงสุดตามกฎหมาย: 15,000 บาท (หักสูงสุด 750.-)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Withholding Tax & Late Penalty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">ภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableWithholdingTax}
                        onChange={(e) =>
                          setFormData({ ...formData, enableWithholdingTax: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formData.enableWithholdingTax
                      ? 'คำนวณหักภาษีตามอัตราที่กำหนดในโปรไฟล์ของแต่ละคน'
                      : 'ปิดการหักภาษี ณ ที่จ่าย (0.00 บาท)'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    อัตราหักมาสายต่อนาที (บาท/นาที)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={formData.latePenaltyPerMinute}
                    onChange={(e) =>
                      setFormData({ ...formData, latePenaltyPerMinute: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    ระบุ 0 เพื่อให้ระบบคำนวณตามสัดส่วนฐานเงินเดือนจริง
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: ข้อมูลเจ้าหน้าที่ผู้จัดทำบัญชี */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                4. ข้อมูลผู้จัดทำ / เจ้าหน้าที่ฝ่ายบัญชี (ผู้รับรองสลิป)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อ-นามสกุล เจ้าหน้าที่บัญชี *
                </label>
                <input
                  type="text"
                  required
                  value={formData.accountantName}
                  onChange={(e) => setFormData({ ...formData, accountantName: e.target.value })}
                  placeholder="เช่น น.ส. พิมพาภรณ์ บัญชีกิจ"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ตำแหน่ง / เลขทะเบียนวิชาชีพบัญชี (CPA / CPD)
                </label>
                <input
                  type="text"
                  value={formData.accountantTitle}
                  onChange={(e) => setFormData({ ...formData, accountantTitle: e.target.value })}
                  placeholder="หัวหน้าฝ่ายการเงินและบัญชีองค์กร (CPA No. 89412)"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 5: ธีมการแสดงผลของระบบ (Display Theme & Lighting Options) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  5. ธีมการแสดงผลของระบบ (Display Theme & Dark Mode)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  เลือกโหมดสีของระบบเพื่อความสบายตาในการใช้งาน เพิ่มทัศนวิสัยทั้งในเวลากลางวันและกะดึก/ที่แสงน้อย
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Option 1: Auto Schedule (18:00 - 06:00) */}
              <button
                type="button"
                id="theme-option-auto"
                onClick={() => handleThemeSelect('auto')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  formData.themeMode === 'auto'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      formData.themeMode === 'auto'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {formData.themeMode === 'auto' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>ออโต้ตามเวลา (18:00-06:00)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                      แนะนำ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    สลับโหมดมืดอัตโนมัติเมื่อถึง 18:00 - 06:00 น. และเป็นโหมดสว่างในเวลา 06:00 - 18:00 น. ไม่ต้องกดเอง
                  </p>
                </div>
              </button>

              {/* Option 2: Light Theme */}
              <button
                type="button"
                id="theme-option-light"
                onClick={() => handleThemeSelect('light')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  formData.themeMode === 'light'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Sun className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      formData.themeMode === 'light'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {formData.themeMode === 'light' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>โหมดสว่างคงที่ (Light)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    พื้นหลังสว่าง คมชัดสูง เหมาะสำหรับใช้งานในเวลากลางวันหรือสำนักงานที่มีแสงสว่างปกติ
                  </p>
                </div>
              </button>

              {/* Option 3: Dark Theme */}
              <button
                type="button"
                id="theme-option-dark"
                onClick={() => handleThemeSelect('dark')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  formData.themeMode === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Moon className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      formData.themeMode === 'dark'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {formData.themeMode === 'dark' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>โหมดมืดคงที่ (Dark)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                      ถนอมสายตา
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    โทนสีเข้ม ลดแสงสะท้อนและอาการล้าสายตา เหมาะสำหรับห้องควบคุมและกะกลางคืนตลอดเวลา
                  </p>
                </div>
              </button>

              {/* Option 4: System Theme */}
              <button
                type="button"
                id="theme-option-system"
                onClick={() => handleThemeSelect('system')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  formData.themeMode === 'system'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      formData.themeMode === 'system'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {formData.themeMode === 'system' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>ตามระบบ (System OS)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    สลับโหมดอัตโนมัติให้ตรงกับการตั้งค่าระบบปฏิบัติการของอุปกรณ์ (Windows/macOS/iOS/Android)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 6: จัดการสถานที่ปฏิบัติงาน & ระบบล็อคพิกัด GPS รัศมีไม่เกิน 100 เมตร */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MapPinned className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>6. จัดการสถานที่ปฏิบัติงาน & ระบบล็อคพิกัด GPS</span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-sans px-2 py-0.5 rounded-full font-bold">
                      ล็อครัศมีไม่เกิน 100 เมตร
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    กำหนดพิกัดสถานที่ปฏิบัติงานจริง ล็อครัศมีการสแกนหน้าบันทึกเวลาเข้า-ออกงานให้อยู่ในพื้นที่ไม่เกิน 100 เมตร
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddLocation}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มสถานที่ปฏิบัติงาน</span>
              </button>
            </div>

            {/* Master GPS 100m Lock Toggle Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                formData.enableGpsVerification
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs text-slate-900 dark:text-white">
                      {formData.enableGpsVerification
                        ? '✓ เปิดระบบล็อคพิกัด GPS รัศมีไม่เกิน 100 เมตร (Strict 100m Geofencing)'
                        : '✕ ปิดการบังคับพิกัด GPS (สแกนได้จากทุกที่ / บันทึกพิกัดเพื่อตรวจสอบย้อนหลัง)'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        formData.enableGpsVerification
                          ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formData.enableGpsVerification ? 'ล็อค 100 เมตร' : 'ปิดล็อคพิกัด'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {formData.enableGpsVerification
                      ? 'เมื่อพนักงานสแกนหน้าผ่านมือถือหรืออุปกรณ์ ระบบจะดึงพิกัด GPS จริงจากดาวเทียม และคำนวณระยะห่าง หากอยู่นอกรัศมี 100 เมตรจากสถานที่ปฏิบัติงานที่เจ้าหน้าที่กำหนดไว้ ระบบจะล็อคการสแกนทันทีเพื่อป้องกันการเช็คอินจากที่บ้าน'
                      : 'พนักงานสามารถสแกนหน้าลงเวลาได้โดยไม่ถูกบล็อกด้วยระยะทาง แต่ระบบจะยังคงบันทึกพิกัด GPS จริงขณะสแกนไว้ในประวัติ'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    id="toggle-gps-verification"
                    type="checkbox"
                    checked={formData.enableGpsVerification}
                    onChange={(e) =>
                      setFormData({ ...formData, enableGpsVerification: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Interactive Staff Live GPS Distance Tester */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>เครื่องมือทดสอบวัดระยะพิกัดจริงของเจ้าหน้าที่ (GPS Live Tester)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    กดเพื่อตรวจสอบระยะห่างระหว่างจุดที่คุณยืนอยู่ขณะนี้ กับพิกัดสถานที่ปฏิบัติงานที่กำหนดไว้
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestStaffLiveGps}
                  disabled={isTestingLiveGps}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isTestingLiveGps ? 'animate-spin' : ''}`} />
                  <span>{isTestingLiveGps ? 'กำลังอ่านพิกัดดาวเทียม...' : '🛰️ ทดสอบวัดระยะจากตำแหน่งปัจจุบัน'}</span>
                </button>
              </div>

              {testGpsError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl text-[11px] text-red-600 dark:text-red-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testGpsError}</span>
                </div>
              )}

              {staffLiveGps && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      📍 ตำแหน่งของคุณ: <strong className="text-slate-900 dark:text-white font-mono">{staffLiveGps.latitude}, {staffLiveGps.longitude}</strong> (ความคลาดเคลื่อน ±{staffLiveGps.accuracy} ม.)
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      เวลาที่อ่าน: {staffLiveGps.timestamp} น.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      ผลการวัดระยะห่างเทียบกับแต่ละสถานที่ (เกณฑ์ล็อคไม่เกิน 100 เมตร):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(formData.workLocations || []).filter(l => l.isActive).map((loc) => {
                        const dist = calculateDistanceMeters(
                          staffLiveGps.latitude,
                          staffLiveGps.longitude,
                          loc.latitude,
                          loc.longitude
                        );
                        const effectiveRadius = Math.min(100, loc.radiusMeters || 100);
                        const inRange = dist <= effectiveRadius;

                        return (
                          <div
                            key={loc.id}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between space-y-1.5 ${
                              inRange
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                {loc.name}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  inRange
                                    ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                }`}
                              >
                                {inRange ? '🟢 ผ่าน (<=100ม.)' : '🔴 เกิน 100 ม.'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 dark:text-slate-400">ระยะห่างจริง:</span>
                              <strong className={`font-mono ${inRange ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                                {dist} เมตร
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* List of Locations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>รายการสถานที่ปฏิบัติงานที่กำหนดไว้ ({(formData.workLocations || []).length} แห่ง)</span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  เปิดใช้งาน {(formData.workLocations || []).filter(l => l.isActive).length} แห่ง (ล็อครัศมีสูงสุด 100 ม.)
                </span>
              </div>

              {(formData.workLocations || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ยังไม่มีสถานที่ปฏิบัติงานในระบบ</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">กดปุ่ม "เพิ่มสถานที่ปฏิบัติงาน" เพื่อกำหนดพิกัดสำนักงานหรือไซต์งาน</p>
                  <button
                    type="button"
                    onClick={handleOpenAddLocation}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มสถานที่แรก</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formData.workLocations || []).map((loc) => (
                    <div
                      key={loc.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        loc.isActive
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                              {loc.name}
                            </h4>
                          </div>

                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              loc.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {loc.isActive ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                          </span>
                        </div>

                        {loc.address && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {loc.address}
                          </p>
                        )}

                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="inline-flex items-center text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md font-mono">
                            <LocateFixed className="w-3 h-3 mr-1 text-blue-500" />
                            {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                          </span>

                          <span className="inline-flex items-center text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md font-semibold">
                            <Compass className="w-3 h-3 mr-1 text-indigo-500" />
                            รัศมี {Math.min(100, loc.radiusMeters || 100)} ม. (ล็อคไม่เกิน 100ม.)
                          </span>

                          <a
                            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
                            title="เปิดดูตำแหน่งจริงบน Google Maps"
                          >
                            <span>แผนที่</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleLocationActive(loc.id)}
                          className={`text-[11px] font-semibold cursor-pointer ${
                            loc.isActive
                              ? 'text-amber-600 dark:text-amber-400 hover:underline'
                              : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                          }`}
                        >
                          {loc.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </button>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLocation(loc)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            title="แก้ไขข้อมูลสถานที่"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-xs font-semibold cursor-pointer"
                            title="ลบสถานที่นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              id="btn-save-company-settings"
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-700 to-slate-900 hover:from-indigo-800 hover:to-black text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-700/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการเปลี่ยนแปลงข้อมูลบริษัท</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Payslip Header Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sticky top-20 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>ตัวอย่างหัวสลิป A4 สด (Live Preview)</span>
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                A4 Header
              </span>
            </div>

            {/* Scaled Mini Payslip Preview */}
            <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl p-3.5 shadow-inner text-[11px] text-slate-800 dark:text-slate-200 space-y-2">
              <div className="flex items-center space-x-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                {formData.enableLogo && formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="max-h-8 max-w-[64px] object-contain shrink-0"
                  />
                ) : null}
                <div className="overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-white truncate leading-tight flex items-center space-x-1.5">
                    <span>{formData.companyName || 'ชื่อบริษัท'}</span>
                    {(!formData.enableLogo || !formData.logoUrl) && (
                      <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded shrink-0">
                        (ไม่มีรูปภาพ)
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate font-sans">
                    {formData.companyNameEn || 'Company English Name'}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
                <p className="line-clamp-2 leading-relaxed">
                  <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                  {formData.address || 'ที่อยู่บริษัท'}
                </p>
                <p>
                  <Phone className="w-3 h-3 inline mr-1 text-slate-400" />
                  โทร: {formData.phoneNumber}
                </p>
                <p className="font-mono">
                  เลขประจำตัวผู้เสียภาษี: <strong>{formData.taxId}</strong>
                </p>
              </div>

              {/* Deductions Preview box */}
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  ผลลัพธ์ในรายการหัก (Deduction Impact):
                </div>
                <div
                  className={`p-2 rounded-lg text-[10px] ${
                    formData.enableSocialSecurity
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>ประกันสังคม:</span>
                    <span className="font-mono font-bold">
                      {formData.enableSocialSecurity ? 'หัก 5% (สูงสุด 750.-)' : 'ไม่มีประกันสังคม (0.00.-)'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {formData.enableSocialSecurity
                      ? 'คำนวณตามเงินเดือนพนักงาน'
                      : 'พนักงานได้รับเงินเดือนเต็ม ไม่หัก ปกส.'}
                  </div>
                </div>
              </div>

              {/* Certified Accountant footer preview */}
              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[9px] text-slate-400 dark:text-slate-500">ผู้รับรองสลิป:</div>
                <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                  {formData.accountantName}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  {formData.accountantTitle}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
              เมื่อกดบันทึก ข้อมูลนี้จะถูกนำไปใช้ออกสลิป A4 และคำนวณเงินเดือนทันที
            </p>
          </div>
        </div>
      </form>

      {/* Add / Edit Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingLocationId ? 'แก้ไขสถานที่ปฏิบัติงาน' : 'เพิ่มสถานที่ปฏิบัติงานใหม่'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    กำหนดจุดพิกัด GPS และรัศมีที่อนุญาตให้พนักงานสแกนหน้าลงเวลา
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อสถานที่ / สาขา / ไซต์งาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สำนักงานใหญ่, ไซต์งานมาบตาพุด, คลังสินค้าบางนา"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ที่อยู่สังเขป / อาคาร / ชั้น / จังหวัด
                </label>
                <input
                  type="text"
                  placeholder="เช่น เลขที่ 88 อาคารอินโนเวชั่น ถ.สุขุมวิท กรุงเทพฯ"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* GPS Coordinates with 1-click current GPS fetch */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    <span>พิกัดภูมิศาสตร์ (GPS Coordinates)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleGetCurrentGps}
                    disabled={isGettingGps}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <LocateFixed className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'กำลังอ่านพิกัด...' : 'ดึงพิกัดจากตำแหน่งปัจจุบัน'}</span>
                  </button>
                </div>

                {gpsError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-2 rounded-lg">
                    {gpsError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-mono">
                      ละติจูด (Latitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={locationForm.latitude}
                      onChange={(e) =>
                        setLocationForm({ ...locationForm, latitude: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-mono">
                      ลองจิจูด (Longitude)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={locationForm.longitude}
                      onChange={(e) =>
                        setLocationForm({ ...locationForm, longitude: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    ตรวจสอบความถูกต้องของพิกัดก่อนบันทึก:
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${locationForm.latitude},${locationForm.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    <span>เปิดดูบน Google Maps</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              {/* Radius with 100m strict limit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <span>รัศมีที่อนุญาตให้สแกนหน้าได้:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-black">{Math.min(100, locationForm.radiusMeters)} เมตร</span>
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    🔒 ล็อคสูงสุดไม่เกิน 100 เมตร
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[20, 50, 75, 100].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLocationForm({ ...locationForm, radiusMeters: r })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        Math.min(100, locationForm.radiusMeters) === r
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {r} ม.{r === 100 ? ' (สูงสุดตามเกณฑ์ 100ม.)' : ''}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={Math.min(100, locationForm.radiusMeters)}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, radiusMeters: Math.min(100, parseInt(e.target.value, 10) || 100) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>10 ม. (เฉพาะจุด)</span>
                  <span>50 ม. (ในอาคาร)</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">100 ม. (ล็อคสูงสุด)</span>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    เปิดใช้งานสถานที่นี้ทันที
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    หากปิดชั่วคราว พนักงานจะไม่สามารถเลือกหรือลงเวลา ณ จุดนี้ได้
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={locationForm.isActive}
                  onChange={(e) => setLocationForm({ ...locationForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingLocationId ? 'บันทึกการแก้ไข' : 'เพิ่มสถานที่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
