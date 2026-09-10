import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Calendar, 
  Building, 
  CreditCard, 
  Mail, 
  Phone,
  User,
  Search,
  FileCheck
} from 'lucide-react';
import { Employee, CompanySettings } from '../types';
import { approveEmployeeByAccountant, rejectEmployeeByAccountant } from '../lib/storage';
import { formatCurrency } from '../lib/thaiBahtText';

interface AccountantApprovalPanelProps {
  employees: Employee[];
  settings: CompanySettings;
  onEmployeeApproved?: () => void;
}

export const AccountantApprovalPanel: React.FC<AccountantApprovalPanelProps> = ({
  employees,
  settings,
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  const pendingEmployees = employees.filter(e => e.approvalStatus === 'pending_accountant');
  const approvedEmployees = employees.filter(e => e.approvalStatus === 'approved');

  const filteredEmployees = employees.filter(emp => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? emp.approvalStatus === 'pending_accountant' :
      emp.approvalStatus === 'approved';

    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleApprove = (emp: Employee) => {
    const success = approveEmployeeByAccountant(emp.id, settings.accountantName);
    if (success) {
      setApprovalFeedback(`อนุมัติพนักงาน [${emp.name}] สำเร็จแล้ว! ตอนนี้พนักงานสามารถสแกนใบหน้าเข้า-ออกงานได้ทันที`);
      setTimeout(() => setApprovalFeedback(null), 5000);
    }
  };

  const handleReject = () => {
    if (!selectedEmp) return;
    rejectEmployeeByAccountant(selectedEmp.id, rejectionReason || 'ข้อมูลค่าจ้างหรือกะเวลายังไม่ถูกต้อง');
    setShowRejectModal(false);
    setSelectedEmp(null);
    setRejectionReason('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">การยืนยันและอนุมัติพนักงานโดยฝ่ายบัญชี</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                  Accountant Approval Gateway
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ผู้ดูแลบัญชี: <strong className="text-slate-800 dark:text-slate-200">{settings.accountantName}</strong> ({settings.accountantTitle})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right px-4 py-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">รอการอนุมัติ</div>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 font-mono">
                {pendingEmployees.length} <span className="text-xs font-normal">คน</span>
              </div>
            </div>
            <div className="text-right px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">อนุมัติแล้ว</div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 font-mono">
                {approvedEmployees.length} <span className="text-xs font-normal">คน</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rule explanation notice */}
        <div className="mt-4 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>มาตรการป้องกันความผิดพลาดทางบัญชี:</strong> หลังจากที่แอดมินลงทะเบียนใบหน้าและข้อมูลเงินเดือนพนักงานแล้ว
            <strong> ฝ่ายบัญชีต้องตรวจสอบความถูกต้องของฐานค่าจ้าง กะเวลาเข้างาน และประกันสังคม </strong>
            ก่อนกดยืนยันอนุมัติเสมอ พนักงานที่ยังไม่ได้รับการอนุมัติจะไม่สามารถสแกนหน้าเข้างานได้ เพื่อป้องกันการคำนวณเงินเดือนผิดพลาด
          </p>
        </div>
      </div>

      {/* Success alert banner */}
      {approvalFeedback && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{approvalFeedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-2xs w-full sm:w-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>รอการอนุมัติ</span>
            {pendingEmployees.length > 0 && (
              <span className="px-1.5 py-0.2 bg-white text-amber-800 rounded-full font-bold text-[10px]">
                {pendingEmployees.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            อนุมัติแล้ว ({approvedEmployees.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ทั้งหมด ({employees.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, แผนก, รหัสพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <FileCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ไม่มีรายการพนักงานในหมวดหมู่นี้</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ทุกรายการได้รับการตรวจสอบและอนุมัติเรียบร้อยแล้ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map((emp) => {
            const isPending = emp.approvalStatus === 'pending_accountant';

            return (
              <div
                key={emp.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-100/70 dark:ring-amber-900/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Profile Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={emp.photoUrl}
                      alt={emp.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{emp.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">({emp.nickname})</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono text-slate-400 dark:text-slate-500">{emp.id}</span>
                        <span>•</span>
                        <span>{emp.position}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{emp.department}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isPending ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-full animate-pulse">
                        รออนุมัติโดยบัญชี
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        อนุมัติแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* Wage & Shift Details for Accountant Review */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>โครงสร้างค่าจ้าง:</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(emp.baseSalary)} บาท ({emp.wageType === 'monthly' ? 'รายเดือน' : emp.wageType === 'daily' ? 'รายวัน' : 'รายชม.'})
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>เวลากะทำงาน:</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {emp.shift.startTime} - {emp.shift.endTime} น.
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      ผ่อนผันสาย {emp.shift.graceMinutes} นาที
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">อัตรา OT ต่อ ชม.:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.otRatePerHour} บาท/ชม.</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">ประกันสังคม / ภาษี:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {emp.socialSecurity ? 'หัก 5%' : 'ไม่หัก'} / ภาษี {emp.withholdingTaxRate}%
                    </span>
                  </div>

                  <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      <span>โอนเงินเดือน: ธ.กสิกรไทย 741-2-XXXXX</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[150px]">{emp.email}</span>
                    </span>
                  </div>
                </div>

                {/* Approval Action Bar */}
                <div className="mt-4 pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {emp.approvedAt ? (
                      <span>อนุมัติเมื่อ: {new Date(emp.approvedAt).toLocaleDateString('th-TH')}</span>
                    ) : (
                      <span>ลงทะเบียนเมื่อ: {new Date(emp.registeredAt).toLocaleDateString('th-TH')}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setShowRejectModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          id={`btn-approve-${emp.id}`}
                          onClick={() => handleApprove(emp)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>ยืนยันและอนุมัติทันที</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>เปิดสิทธิ์สแกนหน้าแล้ว</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>ปฏิเสธการอนุมัติพนักงาน [{selectedEmp.name}]</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              กรุณาระบุเหตุผล เช่น โครงสร้างเงินเดือนไม่ถูกต้อง หรือเวลาเข้างานไม่ตรงกับสัญญาจ้าง:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="เช่น อัตราค่าล่วงเวลาไม่ถูกต้อง กรุณาแก้ไขเป็น 1.5 เท่า..."
              className="w-full text-xs p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
