import React, { useState, useRef, useEffect } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HeartPulse, 
  Plane, 
  Briefcase, 
  Coffee, 
  HelpCircle, 
  Upload, 
  Camera, 
  Paperclip, 
  X, 
  Send, 
  AlertCircle,
  FileText,
  Calendar,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import { Employee, LeaveRequest, LeaveType, LeaveStatus, CompanySettings } from '../types';
import { getLeaveRequests, submitLeaveRequest, cancelLeaveRequest, subscribeToRealtimeUpdates } from '../lib/storage';

interface EmployeeLeaveViewProps {
  currentEmp: Employee;
  settings: CompanySettings;
  onRefreshData?: () => void;
}

export const EmployeeLeaveView: React.FC<EmployeeLeaveViewProps> = ({
  currentEmp,
  settings,
  onRefreshData
}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    return getLeaveRequests().filter(r => r.employeeId === currentEmp.id);
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formType, setFormType] = useState<LeaveType>('annual_leave');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formEndDate, setFormEndDate] = useState(todayStr);
  const [formDaysCount, setFormDaysCount] = useState(1);
  const [formReason, setFormReason] = useState('');
  const [formAttachment, setFormAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Subscribe to real-time leave events
  useEffect(() => {
    const updateList = () => {
      setLeaveRequests(getLeaveRequests().filter(r => r.employeeId === currentEmp.id));
    };

    updateList();

    const unsubscribe = subscribeToRealtimeUpdates((event) => {
      if (
        event.type === 'LEAVE_REQUEST_SUBMITTED' ||
        event.type === 'LEAVE_REQUEST_UPDATED' ||
        event.type === 'LEAVE_REQUEST_DELETED'
      ) {
        updateList();
      }
    });

    return () => unsubscribe();
  }, [currentEmp.id]);

  // Recalculate days count whenever dates change
  useEffect(() => {
    if (!formStartDate || !formEndDate) return;
    const start = new Date(formStartDate);
    const end = new Date(formEndDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) {
      setFormEndDate(formStartDate);
      setFormDaysCount(1);
    } else {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormDaysCount(diffDays);
    }
  }, [formStartDate, formEndDate]);

  const getLeaveTypeDetails = (type: LeaveType) => {
    switch (type) {
      case 'sick_leave':
        return {
          icon: <HeartPulse className="w-4 h-4 text-rose-500" />,
          label: 'ลาป่วย (Sick Leave)',
          desc: 'สำหรับกรณีเจ็บป่วย พักรักษาตัว (แนบใบรับรองแพทย์ได้)',
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'annual_leave':
        return {
          icon: <Plane className="w-4 h-4 text-blue-500" />,
          label: 'ลาพักร้อน (Annual Leave)',
          desc: 'วันลาพักผ่อนประจำปีตามสิทธิ์พนักงาน',
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'personal_leave':
        return {
          icon: <Briefcase className="w-4 h-4 text-purple-500" />,
          label: 'ลากิจ (Personal Leave)',
          desc: 'ติดต่อราชการ ธุระจำเป็นของครอบครัว',
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'holiday_swap':
        return {
          icon: <Coffee className="w-4 h-4 text-amber-500" />,
          label: 'ขอหยุด / สลับวันหยุด',
          desc: 'ขอเปลี่ยนวันหยุดประจำสัปดาห์ หรือขอหยุดชดเชย',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'unpaid_leave':
        return {
          icon: <CalendarDays className="w-4 h-4 text-slate-500" />,
          label: 'ลาไม่รับค่าจ้าง (Unpaid Leave)',
          desc: 'ลาหยุดโดยไม่คิดค่าจ้างในวันดังกล่าว',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-indigo-500" />,
          label: 'การลาอื่นๆ (Other)',
          desc: 'การลาประเภทอื่นตามที่ได้รับอนุญาต',
          bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
        };
    }
  };

  const getStatusPill = (status: LeaveStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            รอแอดมินอนุมัติ
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            อนุมัติเรียบร้อย
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
            ไม่อนุมัติ
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ยกเลิกแล้ว
          </span>
        );
    }
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReason.trim()) {
      alert('กรุณาระบุเหตุผลการขอลา');
      return;
    }

    setIsSubmitting(true);
    const typeDetail = getLeaveTypeDetails(formType);

    submitLeaveRequest({
      employeeId: currentEmp.id,
      employeeName: currentEmp.name,
      department: currentEmp.department,
      leaveType: formType,
      leaveTypeName: typeDetail.label,
      startDate: formStartDate,
      endDate: formEndDate,
      daysCount: formDaysCount,
      reason: formReason.trim(),
      attachmentUrl: formAttachment || undefined
    });

    setIsSubmitting(false);
    setSubmitSuccessMsg('ส่งคำขอลาไปยังแอดมินเรียบร้อยแล้ว');
    setTimeout(() => {
      setSubmitSuccessMsg(null);
      setIsSubmitModalOpen(false);
      setFormReason('');
      setFormAttachment(null);
    }, 1200);

    if (onRefreshData) onRefreshData();
  };

  const handleCancelRequest = (requestId: string) => {
    if (window.confirm('คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?')) {
      cancelLeaveRequest(requestId);
      if (onRefreshData) onRefreshData();
    }
  };

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Button */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>ระบบคำขอลา & ขอหยุดงานออนไลน์</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            ส่งคำขอลา & ขอหยุดงาน (Leave Request)
          </h2>
          <p className="text-xs text-blue-100 max-w-xl">
            ยื่นคำขอลาป่วย ลาพักร้อน ลากิจ หรือขอสลับวันหยุด ระบบจะแจ้งเตือนไปยังแอดมินฝ่ายบุคคลเพื่อตรวจสอบและอนุมัติแบบเรียลไทม์
          </p>
        </div>

        <button
          id="btn-open-leave-request-modal"
          type="button"
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-5 py-3 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-blue-700" />
          <span>ยื่นคำขอลา / ขอหยุดงาน</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">คำขอทั้งหมด</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {leaveRequests.length}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">รอแอดมินอนุมัติ</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">อนุมัติแล้ว</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {approvedCount}
          </div>
        </div>
      </div>

      {/* My Leave Requests List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>ประวัติคำขอลาของคุณ ({leaveRequests.length} รายการ)</span>
          </h3>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            + ยื่นขอลาเพิ่ม
          </button>
        </div>

        {leaveRequests.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              ยังไม่มีประวัติการยื่นคำขอลา
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              เมื่อคุณส่งคำขอลาหรือขอหยุดงาน รายการจะปรากฏที่นี่พร้อมสถานะการพิจารณาจากแอดมินแบบเรียลไทม์
            </p>
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              ยื่นคำขอลาครั้งแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveRequests.map((req) => {
              const typeDetail = getLeaveTypeDetails(req.leaveType);
              const isPending = req.status === 'pending';

              return (
                <div
                  key={req.id}
                  className="p-4.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-blue-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeDetail.bg}`}>
                        {typeDetail.icon}
                        <span>{req.leaveTypeName || typeDetail.label}</span>
                      </span>

                      {getStatusPill(req.status)}
                    </div>

                    <div className="text-xs space-y-1 pt-1">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{req.startDate} ถึง {req.endDate}</span>
                        <span className="text-blue-600 dark:text-blue-400 ml-1">({req.daysCount} วัน)</span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-300 pt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">เหตุผล: </span>
                        <span>{req.reason}</span>
                      </div>

                      {req.attachmentUrl && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAttachment(req.attachmentUrl || null)}
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>ดูไฟล์แนบ / ใบรับรอง</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Admin Review Feedback */}
                    {req.reviewedBy && (
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                        <div className="font-bold flex items-center justify-between">
                          <span>ผลการพิจารณาโดย: {req.reviewedBy}</span>
                          {req.reviewedAt && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(req.reviewedAt).toLocaleDateString('th-TH')}
                            </span>
                          )}
                        </div>
                        {req.reviewNotes && (
                          <div className="text-slate-600 dark:text-slate-400 italic">
                            "{req.reviewNotes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-400">
                    <span>ยื่นเมื่อ {new Date(req.createdAt).toLocaleDateString('th-TH')}</span>
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        ยกเลิกคำขอนี้
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Leave Request Modal Form */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    ยื่นคำขอลา / ขอหยุดงาน
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    พนักงาน: {currentEmp.name} ({currentEmp.id})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{submitSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              {/* Leave Type Selector */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  ประเภทการลา / ขอหยุด *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'annual_leave' as LeaveType, label: '🌴 ลาพักร้อน', desc: 'พักผ่อนประจำปี' },
                    { type: 'sick_leave' as LeaveType, label: '💊 ลาป่วย', desc: 'เจ็บป่วย/พักรักษา' },
                    { type: 'personal_leave' as LeaveType, label: '💼 ลากิจ', desc: 'ติดต่อธุระจำเป็น' },
                    { type: 'holiday_swap' as LeaveType, label: '📅 ขอหยุด/สลับวัน', desc: 'เปลี่ยนวันหยุด' },
                    { type: 'unpaid_leave' as LeaveType, label: '⚪ ลาไม่รับค่าจ้าง', desc: 'Unpaid Leave' },
                    { type: 'other' as LeaveType, label: '✨ อื่นๆ', desc: 'ระบุในเหตุผล' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setFormType(item.type)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        formType === item.type
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    วันที่เริ่มต้นลา *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    วันที่สิ้นสุดลา *
                  </label>
                  <input
                    type="date"
                    required
                    min={formStartDate}
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Total Days Notice */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-blue-900 dark:text-blue-200">
                <span className="font-medium">ระยะเวลารวมที่ขอลา:</span>
                <span className="font-bold text-sm">{formDaysCount} วัน</span>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  เหตุผลการขอลา / รายละเอียด *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="เช่น มีไข้สูงไปพบแพทย์, ติดต่อราชการทำบัตรประชาชน, ลาพักผ่อนกับครอบครัว"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Attachment / Medical Certificate */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  แนบรูปถ่ายหลักฐาน / ใบรับรองแพทย์ (ทางเลือก)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormAttachment(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />

                {formAttachment ? (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={formAttachment}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        แนบรูปถ่ายเรียบร้อย
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormAttachment(null)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl flex items-center justify-center space-x-2 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>คลิกเพื่ออัปโหลดรูปภาพใบรับรอง / เอกสาร</span>
                  </button>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="btn-submit-leave-request"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งคำขอ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งคำขอลาไปยังแอดมิน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
