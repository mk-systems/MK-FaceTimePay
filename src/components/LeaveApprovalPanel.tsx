import React, { useState } from 'react';
import { 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  FileText, 
  Paperclip, 
  Eye, 
  Check, 
  X, 
  Trash2, 
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Plane,
  HeartPulse,
  Briefcase,
  Coffee,
  HelpCircle
} from 'lucide-react';
import { LeaveRequest, LeaveType, LeaveStatus, Employee, CompanySettings } from '../types';
import { approveLeaveRequest, rejectLeaveRequest, deleteLeaveRequest } from '../lib/storage';

interface LeaveApprovalPanelProps {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
  settings: CompanySettings;
  staffName?: string;
  onRefresh?: () => void;
}

export const LeaveApprovalPanel: React.FC<LeaveApprovalPanelProps> = ({
  leaveRequests,
  employees,
  settings,
  staffName = 'แอดมินฝ่ายบุคคล (HR Admin)',
  onRefresh
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  // Modals for Approve / Reject with custom notes
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    request: LeaveRequest | null;
    notes: string;
  }>({
    open: false,
    type: 'approve',
    request: null,
    notes: ''
  });

  const getLeaveTypeBadge = (type: LeaveType) => {
    switch (type) {
      case 'sick_leave':
        return {
          icon: <HeartPulse className="w-3.5 h-3.5 text-rose-500" />,
          label: 'ลาป่วย (Sick Leave)',
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'annual_leave':
        return {
          icon: <Plane className="w-3.5 h-3.5 text-blue-500" />,
          label: 'ลาพักร้อน (Annual Leave)',
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'personal_leave':
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-purple-500" />,
          label: 'ลากิจ (Personal Leave)',
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'holiday_swap':
        return {
          icon: <Coffee className="w-3.5 h-3.5 text-amber-500" />,
          label: 'ขอหยุด / สลับวันหยุด',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'unpaid_leave':
        return {
          icon: <CalendarDays className="w-3.5 h-3.5 text-slate-500" />,
          label: 'ลาไม่รับค่าจ้าง (Unpaid)',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />,
          label: 'การลาอื่นๆ (Other)',
          bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
        };
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            รอการอนุมัติ (Pending)
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            อนุมัติแล้ว (Approved)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
            ไม่อนุมัติ (Rejected)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ยกเลิกแล้ว (Cancelled)
          </span>
        );
    }
  };

  // Filtered requests
  const filtered = leaveRequests.filter((req) => {
    const matchStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchSearch = 
      req.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      req.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      req.department.toLowerCase().includes(search.toLowerCase()) ||
      req.reason.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  const handleOpenApproveModal = (req: LeaveRequest) => {
    setActionModal({
      open: true,
      type: 'approve',
      request: req,
      notes: 'อนุมัติการลาตามระเบียบเรียบร้อยครับ'
    });
  };

  const handleOpenRejectModal = (req: LeaveRequest) => {
    setActionModal({
      open: true,
      type: 'reject',
      request: req,
      notes: 'ขออภัย วันดังกล่าวมีภารกิจด่วนของฝ่าย'
    });
  };

  const handleConfirmAction = () => {
    if (!actionModal.request) return;
    if (actionModal.type === 'approve') {
      approveLeaveRequest(actionModal.request.id, staffName, actionModal.notes);
    } else {
      rejectLeaveRequest(actionModal.request.id, staffName, actionModal.notes);
    }
    setActionModal({ open: false, type: 'approve', request: null, notes: '' });
    if (onRefresh) onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('คุณต้องการลบรายการคำขอนี้ออกจากระบบหรือไม่?')) {
      deleteLeaveRequest(id);
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>ระบบอนุมัติการลาและวันหยุด (Leave Management System)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              คำขอลา & ขอหยุดงานของพนักงาน
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              พิจารณาอนุมัติหรือไม่อนุมัติคำขอลาป่วย ลาพักร้อน ลากิจ และขอหยุดงาน ที่พนักงานส่งมาจากแอปมือถือส่วนตัว
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-center">
              <div className="text-2xl font-black text-amber-300">{pendingCount}</div>
              <div className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">รออนุมัติ</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-center">
              <div className="text-2xl font-black text-emerald-300">{approvedCount}</div>
              <div className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">อนุมัติแล้ว</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">รอการอนุมัติ</span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-2">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ต้องดำเนินการ</p>
        </button>

        <button
          onClick={() => setFilterStatus('approved')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            filterStatus === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">อนุมัติแล้ว</span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-2">
            {approvedCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">บันทึกสิทธิ์สำเร็จ</p>
        </button>

        <button
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            filterStatus === 'rejected'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">ไม่อนุมัติ</span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-2">
            {rejectedCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ปฏิเสธคำขอ</p>
        </button>

        <button
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">คำขอทั้งหมด</span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {leaveRequests.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ประวัติรวม</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            รออนุมัติ ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            อนุมัติแล้ว ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ไม่อนุมัติ ({rejectedCount})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ทั้งหมด ({leaveRequests.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, แผนก, หรือเหตุผล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Leave Requests Cards / List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            ไม่พบรายการคำขอลา
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {filterStatus === 'pending'
              ? 'ขณะนี้ไม่มีคำขอลาที่รอการอนุมัติ พนักงานสามารถส่งคำขอลาผ่านแอปพนักงานได้ตลอดเวลา'
              : 'ไม่มีรายการที่ตรงกับเงื่อนไขการค้นหาในหมวดหมู่นี้'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => {
            const typeBadge = getLeaveTypeBadge(req.leaveType);
            const emp = employees.find(e => e.id === req.employeeId);
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Employee Info & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={emp?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={req.employeeName}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{req.employeeName}</span>
                          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                            ({req.employeeId})
                          </span>
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {req.department}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Leave Details Box */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeBadge.bg}`}>
                        {typeBadge.icon}
                        <span>{req.leaveTypeName || typeBadge.label}</span>
                      </span>

                      <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800/60">
                        รวม {req.daysCount} วัน
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        ช่วงเวลา: <strong>{req.startDate}</strong> {req.startDate !== req.endDate && <>ถึง <strong>{req.endDate}</strong></>}
                      </span>
                    </div>

                    <div className="text-slate-600 dark:text-slate-300 pt-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">เหตุผล: </span>
                      <span className="italic">{req.reason || 'ไม่ได้ระบุเหตุผล'}</span>
                    </div>

                    {/* Attachment Thumbnail if available */}
                    {req.attachmentUrl && (
                      <div className="pt-1.5 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(req.attachmentUrl || null)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-slate-100 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>ดูเอกสาร / ใบรับรองแพทย์</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Review History / Notes if already reviewed */}
                  {req.reviewedBy && (
                    <div className="p-2.5 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          ผู้พิจารณา: {req.reviewedBy}
                        </span>
                        {req.reviewedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(req.reviewedAt).toLocaleDateString('th-TH')}
                          </span>
                        )}
                      </div>
                      {req.reviewNotes && (
                        <p className="text-slate-500 dark:text-slate-400 italic">
                          "{req.reviewNotes}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>ยื่นเมื่อ: {new Date(req.createdAt).toLocaleString('th-TH')}</span>
                    <span className="font-mono text-[9px] text-slate-400">ID: {req.id}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="ลบคำขอนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {isPending ? (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(req)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ไม่อนุมัติ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenApproveModal(req)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm cursor-pointer transition-all active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติการลา</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenApproveModal(req)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        แก้ไขผล
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Approval/Rejection Dialog Modal */}
      {actionModal.open && actionModal.request && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                actionModal.type === 'approve'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}>
                {actionModal.type === 'approve' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {actionModal.type === 'approve' ? 'อนุมัติคำขอลา' : 'ปฏิเสธคำขอลา (ไม่อนุมัติ)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  พนักงาน: {actionModal.request.employeeName} ({actionModal.request.employeeId})
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div><strong>ประเภท:</strong> {actionModal.request.leaveTypeName}</div>
              <div><strong>วันที่:</strong> {actionModal.request.startDate} ถึง {actionModal.request.endDate} (รวม {actionModal.request.daysCount} วัน)</div>
              <div><strong>เหตุผล:</strong> {actionModal.request.reason}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {actionModal.type === 'approve' ? 'ข้อความบันทึกตอบกลับ (ทางเลือก):' : 'เหตุผลที่ไม่อนุมัติ (ระบุให้พนักงานทราบ): *'}
              </label>
              <textarea
                rows={3}
                required={actionModal.type === 'reject'}
                value={actionModal.notes}
                onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                placeholder={actionModal.type === 'approve' ? 'เช่น อนุมัติตามระเบียบบริษัท' : 'เช่น เนื่องจากติดภารกิจประชุมด่วน'}
                className="w-full text-xs p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActionModal({ open: false, type: 'approve', request: null, notes: '' })}
                className="flex-1 py-2.5 px-4 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer ${
                  actionModal.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionModal.type === 'approve' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยืนยันอนุมัติการลา</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>ยืนยันปฏิเสธ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Image Fullscreen Viewer */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-blue-500" />
                <span>เอกสารแนบประกอบการลา</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-slate-950">
              <img
                src={selectedAttachment}
                alt="Leave attachment"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
