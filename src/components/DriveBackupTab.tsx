import React, { useState } from 'react';
import { 
  CloudUpload, 
  FolderCheck, 
  FileSpreadsheet, 
  Database, 
  Save, 
  Building2, 
  CheckCircle, 
  ShieldCheck, 
  Settings,
  Clock,
  Download
} from 'lucide-react';
import { CompanySettings, MonthlyPayrollSummary } from '../types';
import { saveCompanySettings, getPayrollSummaries } from '../lib/storage';
import { GoogleExportDriveModal } from './GoogleExportDriveModal';

interface DriveBackupTabProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
}

export const DriveBackupTab: React.FC<DriveBackupTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [activeExportSummary, setActiveExportSummary] = useState<MonthlyPayrollSummary | null>(null);

  const summaries = Object.values(getPayrollSummaries());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanySettings(formData);
    onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <CloudUpload className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">สำรองข้อมูลประจำเดือนลง Google Drive & Sheet</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Drive Backup Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กำหนดโฟลเดอร์ Google Drive และเทมเพลต Sheet ขององค์กรสำหรับบันทึกสำรองข้อมูลเวลาและเงินเดือนทุกสิ้นเดือน
              </p>
            </div>
          </div>
        </div>

        {isSaved && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>บันทึกการตั้งค่าองค์กรและที่เก็บ Google Drive เรียบร้อยแล้ว</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Settings Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>การลงทะเบียนโฟลเดอร์และข้อมูลองค์กร</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  โฟลเดอร์ Google Drive ที่ลงทะเบียนไว้ (Registered Drive Folder) *
                </label>
                <div className="relative">
                  <FolderCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.registeredDriveFolder}
                    onChange={(e) => setFormData({ ...formData, registeredDriveFolder: e.target.value })}
                    placeholder="เช่น Google Drive / DIS_HR_Backups / Monthly_Payroll_2026"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-100 bg-emerald-50/30 dark:bg-slate-800/80 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  ระบุตำแหน่งโฟลเดอร์ใน Google Drive ที่องค์กรเตรียมไว้สำหรับจัดเก็บไฟล์สำรองแต่ละงวดเดือน
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อไฟล์ Google Sheet Master *
                </label>
                <div className="relative">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.registeredSheetName}
                    onChange={(e) => setFormData({ ...formData, registeredSheetName: e.target.value })}
                    placeholder="DIS_Attendance_Payroll_Master"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อองค์กร (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">เลขประจำตัวผู้เสียภาษี 13 หลัก</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ชื่อผู้ดูแลบัญชีองค์กร</label>
                  <input
                    type="text"
                    value={formData.accountantName}
                    onChange={(e) => setFormData({ ...formData, accountantName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ตำแหน่ง / ทะเบียน CPA</label>
                  <input
                    type="text"
                    value={formData.accountantTitle}
                    onChange={(e) => setFormData({ ...formData, accountantTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">อัตราหักมาสาย (บาท/นาที)</label>
                  <input
                    type="number"
                    value={formData.latePenaltyPerMinute}
                    onChange={(e) => setFormData({ ...formData, latePenaltyPerMinute: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">ใส่ 0 หากต้องการคิดตามสัดส่วนฐานเงินเดือน</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์องค์กร</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Monthly Backups List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Monthly Backup List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ประวัติการสำรองข้อมูลรายเดือน (Monthly Backups)</span>
            </h3>

            <div className="space-y-2.5">
              {summaries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  ยังไม่มีงวดเงินเดือนที่สรุป (กดสรุปในแท็บเงินเดือนก่อน)
                </div>
              ) : (
                summaries.map((sum) => (
                  <div
                    key={sum.periodMonth}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{sum.periodName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sum.records.length} รายการ • ฿{sum.totalNetPay.toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveExportSummary(sum)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <CloudUpload className="w-3 h-3" />
                      <span>Export ลง Drive</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {activeExportSummary && (
        <GoogleExportDriveModal
          summary={activeExportSummary}
          settings={formData}
          onClose={() => setActiveExportSummary(null)}
        />
      )}
    </div>
  );
};

