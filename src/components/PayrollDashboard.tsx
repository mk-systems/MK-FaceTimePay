import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Sparkles, 
  Printer, 
  Mail, 
  CloudUpload, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { MonthlyPayrollSummary, PayrollRecord, CompanySettings } from '../types';
import { calculateMonthlyPayroll, getPayrollSummaries, markPayslipEmailSent } from '../lib/storage';
import { formatCurrency } from '../lib/thaiBahtText';
import { PayslipA4View } from './PayslipA4View';

interface PayrollDashboardProps {
  settings: CompanySettings;
  onOpenExportModal: () => void;
}

export const PayrollDashboard: React.FC<PayrollDashboardProps> = ({
  settings,
  onOpenExportModal,
}) => {
  const currentMonthPeriod = '2026-09';
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthPeriod);
  const [summary, setSummary] = useState<MonthlyPayrollSummary | null>(null);
  const [selectedRecordForPayslip, setSelectedRecordForPayslip] = useState<PayrollRecord | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [batchEmailSending, setBatchEmailSending] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load existing summary or auto-compute
  const loadSummary = (period: string) => {
    const allSummaries = getPayrollSummaries();
    if (allSummaries[period]) {
      setSummary(allSummaries[period]);
    } else {
      // Auto compute initial
      const computed = calculateMonthlyPayroll(period);
      setSummary(computed);
    }
  };

  useEffect(() => {
    loadSummary(selectedPeriod);
  }, [selectedPeriod]);

  // Handle 1-Click Calculation
  const handleOneClickSummary = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const computed = calculateMonthlyPayroll(selectedPeriod);
      setSummary(computed);
      setIsCalculating(false);
      setNotification(`🎉 สรุปเงินเดือนงวด ${computed.periodName} สำเร็จในคลิกเดียว! ระบบประมวลผลเวลาทำงาน OT และสร้างสลิปเงินเดือน A4 เรียบร้อยแล้ว`);
      setTimeout(() => setNotification(null), 6000);
    }, 700);
  };

  // Handle Send All Payslips via Email
  const handleSendAllEmails = () => {
    if (!summary) return;
    setBatchEmailSending(true);

    setTimeout(() => {
      summary.records.forEach((r) => {
        markPayslipEmailSent(summary.periodMonth, r.employeeId);
      });
      loadSummary(summary.periodMonth);
      setBatchEmailSending(false);
      setNotification(`✉️ ส่งสลิปเงินเดือน A4 ไปยังอีเมลของพนักงานทุกคน (${summary.records.length} ท่าน) สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => setNotification(null), 6000);
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">สรุปเงินเดือนประจำเดือน & ออกสลิป A4 ในคลิกเดียว</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                1-Click Payroll Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ฝ่ายบัญชีกดสรุปเพียงครั้งเดียว ระบบจะดึงประวัติสแกนหน้า คำนวณวันทำงาน OT หักสาย ประกันสังคม และออกสลิป PDF A4 พร้อมส่งอีเมลทันที
            </p>
          </div>

          {/* Period Selector & 1-Click Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-hidden"
              >
                <option value="2026-09" className="dark:bg-slate-900 dark:text-white">งวด: กันยายน 2569</option>
                <option value="2026-08" className="dark:bg-slate-900 dark:text-white">งวด: สิงหาคม 2569</option>
                <option value="2026-07" className="dark:bg-slate-900 dark:text-white">งวด: กรกฎาคม 2569</option>
              </select>
            </div>

            <button
              id="btn-one-click-payroll"
              onClick={handleOneClickSummary}
              disabled={isCalculating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCalculating ? 'กำลังประมวลผล...' : 'กดสรุปเงินเดือนใน 1 คลิก'}</span>
            </button>
          </div>
        </div>

        {/* Notification message */}
        {notification && (
          <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Summary Metrics */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5">
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">ยอดเงินเดือนสุทธิต้องจ่าย</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 font-mono mt-0.5">
                ฿{formatCurrency(summary.totalNetPay)}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">รวมภาษีและประกันสังคมแล้ว</div>
            </div>

            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3.5">
              <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">ยอดเงินได้รวม (Gross)</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-950 dark:text-blue-100 font-mono mt-0.5">
                ฿{formatCurrency(summary.totalGrossIncome)}
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">ฐานเงินเดือน + OT + เบี้ยขยัน</div>
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3.5">
              <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">ยอดรายการหักรวม</div>
              <div className="text-xl sm:text-2xl font-bold text-rose-950 dark:text-rose-100 font-mono mt-0.5">
                ฿{formatCurrency(summary.totalDeductions)}
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">ประกันสังคม / ภาษี / สาย</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">พนักงานที่คำนวณงวดนี้</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {summary.totalEmployees} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ท่าน</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">เฉพาะที่ผ่านการอนุมัติบัญชี</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar for Batch Operations */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
          <ReceiptText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>ตารางสรุปรายบุคคลประจำเดือน: <strong className="text-slate-900 dark:text-white">{summary?.periodName}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-send-all-payslips-email"
            onClick={handleSendAllEmails}
            disabled={batchEmailSending || !summary}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{batchEmailSending ? 'กำลังส่งอีเมล...' : 'ส่งสลิป A4 ให้ทุกคนทางอีเมล'}</span>
          </button>

          <button
            id="btn-export-sheets-drive"
            onClick={onOpenExportModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Export เป็น Sheet ลง Drive</span>
          </button>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase">
              <tr>
                <th className="px-4 py-3">พนักงาน</th>
                <th className="px-4 py-3">วันทำงาน / สาย</th>
                <th className="px-4 py-3">ฐานเงินเดือน</th>
                <th className="px-4 py-3">ค่าล่วงเวลา (OT)</th>
                <th className="px-4 py-3">เงินเพิ่ม / เบี้ยขยัน</th>
                <th className="px-4 py-3">หัก ปกส./ภาษี/สาย</th>
                <th className="px-4 py-3">เงินเดือนสุทธิ (Net)</th>
                <th className="px-4 py-3 text-center">สลิป & อีเมล</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!summary || summary.records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    ไม่พบข้อมูลเงินเดือนในงวดนี้ กรุณากดปุ่ม &quot;สรุปเงินเดือนใน 1 คลิก&quot; ด้านบน
                  </td>
                </tr>
              ) : (
                summary.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{rec.department} ({rec.nickname})</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{rec.actualWorkDays} / {rec.scheduledDays} วัน</div>
                      {rec.totalLateMinutes > 0 ? (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">สาย {rec.totalLateMinutes} นาที</div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">ไม่เคยสาย</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                      ฿{formatCurrency(rec.earnedBasePay)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-semibold text-blue-900 dark:text-blue-300">฿{formatCurrency(rec.otPay)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">({rec.totalOtHours} ชม.)</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                      ฿{formatCurrency(rec.totalAllowances)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-semibold text-rose-700 dark:text-rose-400">-฿{formatCurrency(rec.totalDeductions)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">ปกส. {rec.socialSecurity} | ภาษี {rec.withholdingTax}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        ฿{formatCurrency(rec.netPay)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {rec.payslipEmailSent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                          ส่งอีเมลแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          ยังไม่ส่งอีเมล
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        id={`btn-view-payslip-${rec.employeeId}`}
                        onClick={() => setSelectedRecordForPayslip(rec)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-2xs inline-flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <span>ดูสลิป A4</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* A4 Payslip Modal Viewer */}
      {selectedRecordForPayslip && (
        <PayslipA4View
          record={selectedRecordForPayslip}
          settings={settings}
          onClose={() => {
            setSelectedRecordForPayslip(null);
            loadSummary(selectedPeriod);
          }}
        />
      )}
    </div>
  );
};
