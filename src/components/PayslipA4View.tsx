import React, { useState } from 'react';
import { 
  Printer, 
  Mail, 
  Download, 
  CheckCircle, 
  X, 
  Building2, 
  ExternalLink,
  Send,
  AlertCircle
} from 'lucide-react';
import { PayrollRecord, CompanySettings } from '../types';
import { formatCurrency } from '../lib/thaiBahtText';
import { markPayslipEmailSent } from '../lib/storage';

interface PayslipA4ViewProps {
  record: PayrollRecord;
  settings: CompanySettings;
  onClose: () => void;
}

export const PayslipA4View: React.FC<PayslipA4ViewProps> = ({
  record,
  settings,
  onClose,
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(record.payslipEmailSent);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setEmailSending(true);

    // Simulate sending email and generating mailto / gmail link
    setTimeout(() => {
      markPayslipEmailSent(record.periodMonth, record.employeeId);
      setEmailSending(false);
      setEmailSentSuccess(true);
      setTimeout(() => {
        setEmailModalOpen(false);
      }, 1500);
    }, 1000);
  };

  // Gmail direct compose link
  const emailSubject = encodeURIComponent(`สลิปเงินเดือนประจำเดือน ${record.periodName} - ${settings.companyName} (${record.employeeName})`);
  const emailBody = encodeURIComponent(
`เรียนคุณ ${record.employeeName} (${record.nickname})

ทางฝ่ายการเงินและบัญชี บริษัท ${settings.companyName} ได้ทำการสรุปเงินเดือนประจำงวด ${record.periodName} เรียบร้อยแล้ว

สรุปข้อมูลการจ่ายเงินเดือน:
- เงินเดือน/ค่าจ้างพื้นฐาน: ${formatCurrency(record.earnedBasePay)} บาท
- ค่าล่วงเวลา (OT ${record.totalOtHours} ชม.): ${formatCurrency(record.otPay)} บาท
- เงินเพิ่ม/เบี้ยเลี้ยง/เบี้ยขยัน: ${formatCurrency(record.totalAllowances)} บาท
- รายการหัก (ประกันสังคม/ภาษี/สาย): ${formatCurrency(record.totalDeductions)} บาท
- ยอดเงินเดือนสุทธิที่ได้รับ: ${formatCurrency(record.netPay)} บาท (${record.netPayThaiText})
- โอนเข้าบัญชี: ${record.bankAccount.bankName} เลขที่ ${record.bankAccount.accountNumber}

สลิปเงินเดือนฉบับทางการขนาด A4 ถูกแนบมาพร้อมข้อความนี้
หากมีข้อสงสัยเกี่ยวกับข้อมูลเวลาหรือรายการหัก กรุณาติดต่อฝ่ายบัญชี

ขอแสดงความนับถือ
${settings.accountantName}
${settings.accountantTitle}
${settings.companyName}
โทร. ${settings.phoneNumber}`
  );

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(record.email)}&su=${emailSubject}&body=${emailBody}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none">
        
        {/* Floating Action Bar (Hidden during printing) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <span className="font-bold text-xs sm:text-sm truncate">ใบจ่ายเงินเดือน A4 (Standard Payslip)</span>
            <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full shrink-0">
              งวด {record.periodName}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer sm:hidden ml-auto"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setEmailModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>ส่งอีเมล</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>พิมพ์ / PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile touch scroll hint */}
        <div className="sm:hidden bg-blue-50 text-blue-800 text-[11px] px-3 py-1.5 border-b border-blue-200 flex items-center justify-between no-print">
          <span>📱 เลื่อนซ้าย-ขวาเพื่อดูสลิป A4 ฉบับเต็ม หรือกดพิมพ์ PDF</span>
        </div>

        {/* ========================================================
            OFFICIAL A4 PORTRAIT PAYSLIP DOCUMENT
            Wrapped in horizontal scroll for mobile screens
            Styled precisely for standard 210mm x 297mm printing
           ======================================================== */}
        <div className="overflow-x-auto w-full bg-slate-100 print:bg-white p-2 sm:p-6 lg:p-8">
          <div className="min-w-[680px] max-w-[800px] mx-auto p-6 sm:p-8 text-slate-900 bg-white font-['Sarabun',sans-serif] leading-normal shadow-sm border border-slate-200 sm:rounded-xl print:border-none print:shadow-none print:p-2 print:min-w-0">
          
          {/* Header & Company Details */}
          <div className="border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                {settings.enableLogo && settings.logoUrl ? (
                  <div className="flex items-center space-x-3 mb-1">
                    <img
                      src={settings.logoUrl}
                      alt={settings.companyName}
                      className="max-h-12 max-w-[140px] object-contain shrink-0"
                    />
                    <div>
                      <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                        {settings.companyName}
                      </h1>
                      <p className="text-xs text-slate-600 font-sans tracking-wide">
                        {settings.companyNameEn}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-1">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {settings.companyName}
                    </h1>
                    <p className="text-xs text-slate-600 font-sans tracking-wide">
                      {settings.companyNameEn}
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-600 max-w-lg mt-1">
                  {settings.address} • โทร: {settings.phoneNumber}
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  เลขประจำตัวผู้เสียภาษีอากร: <strong>{settings.taxId}</strong>
                </p>
              </div>

              {/* Payslip Badge */}
              <div className="text-right">
                <div className="inline-block border-2 border-slate-900 bg-slate-50 px-3 py-1.5 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    ใบจ่ายเงินเดือน / PAYSLIP
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">
                    (สำเนาสำหรับพนักงาน)
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-2">
                  ประจำเดือน: <span className="text-blue-900 font-extrabold">{record.periodName}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  เลขที่เอกสาร: {record.id}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Information Strip */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">รหัสพนักงาน (ID):</span>
              <span className="font-mono font-bold text-slate-900">{record.employeeId}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">ชื่อ-นามสกุล:</span>
              <span className="font-bold text-slate-900">{record.employeeName} ({record.nickname})</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">แผนก / สังกัด:</span>
              <span className="font-medium text-slate-800">{record.department}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">ตำแหน่ง:</span>
              <span className="font-medium text-slate-800">{record.position}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">วันทำงานจริง / วันตามกะ:</span>
              <span className="font-bold text-slate-800">{record.actualWorkDays} / {record.scheduledDays} วัน</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">ชั่วโมงทำงานล่วงเวลา (OT):</span>
              <span className="font-bold text-blue-900">{record.totalOtHours} ชั่วโมง</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">เวลามาสายสะสม:</span>
              <span className="font-bold text-amber-900">{record.totalLateMinutes} นาที</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">บัญชีรับเงินเดือน:</span>
              <span className="font-mono text-slate-900 font-semibold">{record.bankAccount.accountNumber}</span>
            </div>
          </div>

          {/* Earnings & Deductions Dual-Column Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
            <div className="grid grid-cols-2 bg-slate-800 text-white font-bold text-xs uppercase divide-x divide-slate-700">
              <div className="py-2 px-3.5 flex justify-between">
                <span>รายการได้ (EARNINGS)</span>
                <span>จำนวนเงิน (บาท)</span>
              </div>
              <div className="py-2 px-3.5 flex justify-between">
                <span>รายการหัก (DEDUCTIONS)</span>
                <span>จำนวนเงิน (บาท)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-300 text-xs text-slate-800">
              {/* Earnings Column */}
              <div className="p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span>เงินเดือน / ค่าจ้างพื้นฐาน</span>
                  <span className="font-mono font-semibold">{formatCurrency(record.earnedBasePay)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าล่วงเวลา (OT {record.totalOtHours} ชม.)</span>
                  <span className="font-mono font-semibold">{formatCurrency(record.otPay)}</span>
                </div>
                {record.allowances.position > 0 && (
                  <div className="flex justify-between">
                    <span>เงินเพิ่มค่าตำแหน่ง</span>
                    <span className="font-mono font-semibold">{formatCurrency(record.allowances.position)}</span>
                  </div>
                )}
                {record.allowances.transport > 0 && (
                  <div className="flex justify-between">
                    <span>ค่าพาหนะ / ค่าเดินทาง</span>
                    <span className="font-mono font-semibold">{formatCurrency(record.allowances.transport)}</span>
                  </div>
                )}
                {record.allowances.meal > 0 && (
                  <div className="flex justify-between">
                    <span>ค่าอาหาร / เบี้ยเลี้ยง</span>
                    <span className="font-mono font-semibold">{formatCurrency(record.allowances.meal)}</span>
                  </div>
                )}
                {record.allowances.diligence > 0 && (
                  <div className="flex justify-between">
                    <span>เบี้ยขยัน (ไม่ขาด/ไม่สายเกินเกณฑ์)</span>
                    <span className="font-mono font-semibold">{formatCurrency(record.allowances.diligence)}</span>
                  </div>
                )}
                {record.allowances.other > 0 && (
                  <div className="flex justify-between">
                    <span>เงินได้พิเศษอื่นๆ</span>
                    <span className="font-mono font-semibold">{formatCurrency(record.allowances.other)}</span>
                  </div>
                )}
              </div>

              {/* Deductions Column */}
              <div className="p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span>
                    {settings.enableSocialSecurity !== false
                      ? `เงินสมทบประกันสังคม (${settings.socialSecurityRate ?? 5}% สูงสุด ${settings.socialSecurityMaxBase ? (settings.socialSecurityMaxBase * ((settings.socialSecurityRate ?? 5) / 100)) : 750}.-)`
                      : 'เงินสมทบประกันสังคม (ไม่มี/ไม่หัก ปกส.)'}
                  </span>
                  <span className="font-mono font-semibold text-rose-700">
                    {settings.enableSocialSecurity !== false && record.socialSecurity > 0
                      ? formatCurrency(record.socialSecurity)
                      : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {formatCurrency(record.withholdingTax)}
                  </span>
                </div>
                {record.lateDeduction > 0 && (
                  <div className="flex justify-between">
                    <span>หักมาสาย ({record.totalLateMinutes} นาที)</span>
                    <span className="font-mono font-semibold text-rose-700">
                      {formatCurrency(record.lateDeduction)}
                    </span>
                  </div>
                )}
                {record.otherDeductions > 0 && (
                  <div className="flex justify-between">
                    <span>รายการหักอื่นๆ</span>
                    <span className="font-mono font-semibold text-rose-700">
                      {formatCurrency(record.otherDeductions)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subtotal Row */}
            <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 bg-slate-100 font-bold text-xs">
              <div className="py-2.5 px-3.5 flex justify-between">
                <span>รวมเงินได้ (TOTAL EARNINGS)</span>
                <span className="font-mono text-blue-900">{formatCurrency(record.grossIncome)}</span>
              </div>
              <div className="py-2.5 px-3.5 flex justify-between">
                <span>รวมเงินหัก (TOTAL DEDUCTIONS)</span>
                <span className="font-mono text-rose-700">{formatCurrency(record.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* NET PAY HIGHLIGHT BOX */}
          <div className="border-2 border-slate-900 bg-emerald-50/70 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                เงินได้สุทธิที่ได้รับ (NET PAYABLE AMOUNT)
              </div>
              <div className="text-xs font-semibold text-emerald-900 mt-1">
                จำนวนเงินตัวอักษร: <span className="underline decoration-emerald-500 font-bold">{record.netPayThaiText}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900">
                ฿{formatCurrency(record.netPay)}
              </div>
              <div className="text-[11px] text-slate-500">บาท (THB)</div>
            </div>
          </div>

          {/* Signatures & Authorization Strip */}
          <div className="border-t border-slate-300 pt-6 mt-6 grid grid-cols-2 gap-8 text-xs text-center">
            <div>
              <div className="h-14 border-b border-dashed border-slate-400 max-w-xs mx-auto flex items-end justify-center pb-1">
                <span className="font-serif italic text-slate-500">พิมพ์ภาพรณ์ บัญชีกิจ</span>
              </div>
              <div className="mt-1.5 font-bold text-slate-900">{settings.accountantName}</div>
              <div className="text-[11px] text-slate-500">{settings.accountantTitle}</div>
              <div className="text-[10px] text-slate-400">ผู้จัดทำและอนุมัติจ่าย (Authorized Accountant)</div>
            </div>

            <div>
              <div className="h-14 border-b border-dashed border-slate-400 max-w-xs mx-auto flex items-end justify-center pb-1">
                <span className="text-xs text-slate-400">[ ลายมือชื่อพนักงานผู้รับเงิน ]</span>
              </div>
              <div className="mt-1.5 font-bold text-slate-900">{record.employeeName}</div>
              <div className="text-[11px] text-slate-500">วันที่รับทราบ: {new Date().toLocaleDateString('th-TH')}</div>
              <div className="text-[10px] text-slate-400">พนักงานผู้มีสิทธิ์รับเงินเดือน</div>
            </div>
          </div>

          {/* Legal / System Verification Footer */}
          <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <div>
              เอกสารนี้สร้างจากระบบสแกนใบหน้าและคำนวณเงินเดือนอัตโนมัติ MK FaceTimePay
            </div>
            <div>
              วันที่พิมพ์: {new Date().toLocaleString('th-TH')}
            </div>
          </div>

          </div>
        </div>

      </div>

      {/* Direct Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>ส่งสลิปเงินเดือน A4 ไปยังอีเมลพนักงาน</span>
              </h3>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">อีเมลผู้รับ:</label>
                <input
                  type="text"
                  readOnly
                  value={`${record.employeeName} <${record.email}>`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">หัวข้ออีเมล:</label>
                <input
                  type="text"
                  readOnly
                  value={`สลิปเงินเดือนประจำเดือน ${record.periodName} - ${settings.companyName}`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ข้อความในอีเมล:</label>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {`เรียนคุณ ${record.employeeName}\n\nสลิปเงินเดือนประจำเดือน ${record.periodName} ได้รับการอนุมัติแล้ว\nยอดเงินเดือนสุทธิ: ฿${formatCurrency(record.netPay)} (${record.netPayThaiText})\nโอนเข้าบัญชี: ${record.bankAccount.bankName} ${record.bankAccount.accountNumber}\n\nแนบไฟล์: สลิปเงินเดือน_A4_${record.employeeId}_${record.periodMonth}.pdf`}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start space-x-2 text-[11px]">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>ระบบส่งออกสลิปเงินเดือนทันที:</strong> สามารถคลิกส่งผ่านระบบอัตโนมัติ หรือเปิดส่งตรงผ่าน Gmail ด้วยบัญชีองค์กรได้ทันที
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดเขียนใน Gmail</span>
              </a>

              <div className="flex space-x-2">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  {emailSending ? (
                    <span>กำลังส่งอีเมล...</span>
                  ) : emailSentSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-300" />
                      <span>ส่งเรียบร้อยแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งอีเมลทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
