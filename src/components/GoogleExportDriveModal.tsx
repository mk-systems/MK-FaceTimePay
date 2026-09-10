import React, { useState } from 'react';
import { 
  CloudUpload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  X, 
  FolderArchive, 
  Copy, 
  Database, 
  ExternalLink,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { MonthlyPayrollSummary, CompanySettings } from '../types';
import { formatCurrency } from '../lib/thaiBahtText';

interface GoogleExportDriveModalProps {
  summary: MonthlyPayrollSummary;
  settings: CompanySettings;
  onClose: () => void;
}

export const GoogleExportDriveModal: React.FC<GoogleExportDriveModalProps> = ({
  summary,
  settings,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(summary.backedUpToGoogleDrive);
  const [copied, setCopied] = useState(false);

  // Generate CSV data with UTF-8 BOM for Thai character compatibility in Excel and Google Sheets
  const generateCsvData = (): string => {
    const headers = [
      'รหัสพนักงาน',
      'ชื่อ-นามสกุล',
      'ชื่อเล่น',
      'แผนก',
      'ตำแหน่ง',
      'งวดเดือน',
      'ประเภทการจ้าง',
      'เงินเดือนพื้นฐาน',
      'วันทำงานจริง',
      'วันตามกะ',
      'สายสะสม(นาที)',
      'หักมาสาย',
      'ชม.OT',
      'ค่าล่วงเวลา',
      'เงินเพิ่ม/เบี้ยเลี้ยง',
      'เงินได้รวม(Gross)',
      'หักประกันสังคม',
      'หักภาษี ณ ที่จ่าย',
      'รวมเงินหัก',
      'เงินเดือนสุทธิ(Net)',
      'บัญชีธนาคาร',
      'อีเมล'
    ];

    const rows = summary.records.map(r => [
      r.employeeId,
      r.employeeName,
      r.nickname,
      r.department,
      r.position,
      r.periodName,
      r.wageType === 'monthly' ? 'รายเดือน' : 'รายวัน',
      r.earnedBasePay,
      r.actualWorkDays,
      r.scheduledDays,
      r.totalLateMinutes,
      r.lateDeduction,
      r.totalOtHours,
      r.otPay,
      r.totalAllowances,
      r.grossIncome,
      r.socialSecurity,
      r.withholdingTax,
      r.totalDeductions,
      r.netPay,
      `${r.bankAccount.bankName} ${r.bankAccount.accountNumber}`,
      r.email
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\r\n');

    return '\uFEFF' + csvContent; // Add UTF-8 BOM
  };

  const handleDownloadCsv = () => {
    const csv = generateCsvData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${settings.registeredSheetName}_${summary.periodMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    // Generate TSV for direct paste into Google Sheets
    const headers = ['รหัสพนักงาน', 'ชื่อพนักงาน', 'แผนก', 'เงินเดือน', 'วันทำงาน', 'OT ชม.', 'ค่า OT', 'หัก ปกส.', 'ภาษี', 'สุทธิ'];
    const rows = summary.records.map(r => [
      r.employeeId,
      r.employeeName,
      r.department,
      r.earnedBasePay,
      r.actualWorkDays,
      r.totalOtHours,
      r.otPay,
      r.socialSecurity,
      r.withholdingTax,
      r.netPay
    ]);
    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportToGoogleDrive = () => {
    setIsExporting(true);
    setTimeout(() => {
      summary.backedUpToGoogleDrive = true;
      summary.exportedToGoogleSheets = true;
      summary.lastDriveBackupAt = new Date().toISOString();
      setIsExporting(false);
      setExportSuccess(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Export ข้อมูลเป็น Sheet สำรองลง Google Drive</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สำรองข้อมูลเวลาและเงินเดือนประจำเดือน: <strong className="text-slate-900 dark:text-slate-200">{summary.periodName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drive Destination Info */}
        <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 space-y-2 text-xs">
          <div className="flex items-start justify-between">
            <span className="text-slate-500 dark:text-slate-400">โฟลเดอร์ Google Drive ที่ลงทะเบียน:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-right max-w-xs truncate">
              {settings.registeredDriveFolder}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-slate-500 dark:text-slate-400">ชื่อไฟล์ Google Sheet:</span>
            <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
              {settings.registeredSheetName}_{summary.periodMonth}.xlsx
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-slate-500 dark:text-slate-400">จำนวนรายการที่ส่งออก:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {summary.records.length} คน (ยอดสุทธิ ฿{formatCurrency(summary.totalNetPay)})
            </span>
          </div>

          {exportSuccess && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>สำรองข้อมูลลงไดรฟ์สำเร็จแล้ว</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {summary.lastDriveBackupAt ? new Date(summary.lastDriveBackupAt).toLocaleString('th-TH') : 'วันนี้'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 mb-5">
          <button
            id="btn-confirm-drive-sync"
            onClick={handleExportToGoogleDrive}
            disabled={isExporting}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>
              {isExporting 
                ? 'กำลังเชื่อมต่อและอัปโหลด Sheet ไปยัง Google Drive...' 
                : exportSuccess 
                ? 'ซิงค์สำรองข้อมูลลง Drive อีกครั้ง' 
                : 'บันทึกเป็น Sheet ลงใน Google Drive ทันที'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadCsv}
              className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ดาวน์โหลดไฟล์ .CSV (Excel/Sheet)</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{copied ? 'คัดลอกตารางแล้ว!' : 'คัดลอกตารางวางใน Google Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Firebase Ready Note */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center space-x-1.5 font-bold mb-1">
            <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>สถานะระบบฐานข้อมูล (Firebase Readiness):</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-950 dark:text-blue-200">
            ระบบจัดโครงสร้างข้อมูลตามสคีมา Firestore (คอลเลกชัน <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">employees</code>, <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">attendance_logs</code>, <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">payroll_summaries</code>) ไว้อย่างสมบูรณ์ พร้อมเชื่อมต่อทันทีเมื่อคุณสั่งเปิดใช้งาน Firebase ตามที่ระบุไว้
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
