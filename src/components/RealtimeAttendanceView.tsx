import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Calendar, 
  User, 
  Building, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight,
  ShieldCheck,
  Eye,
  MapPin,
  X
} from 'lucide-react';
import { AttendanceLog, Employee } from '../types';

interface RealtimeAttendanceViewProps {
  logs: AttendanceLog[];
  employees: Employee[];
}

export const RealtimeAttendanceView: React.FC<RealtimeAttendanceViewProps> = ({
  logs,
  employees,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'overtime'>('all');
  const [previewPhotoLog, setPreviewPhotoLog] = useState<AttendanceLog | null>(null);

  // Filter logs based on date, department, search, and status
  const filteredLogs = logs.filter((log) => {
    const matchDate = selectedDate ? log.date === selectedDate : true;
    const matchDept = selectedDept === 'all' ? true : log.department === selectedDept;
    const matchSearch = log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                        log.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : log.status === statusFilter;

    return matchDate && matchDept && matchSearch && matchStatus;
  });

  // Calculate stats for selected date
  const dateLogs = logs.filter(l => l.date === selectedDate);
  const checkedInIds = new Set(dateLogs.filter(l => l.type === 'check_in').map(l => l.employeeId));
  const lateCount = dateLogs.filter(l => l.type === 'check_in' && l.status === 'late').length;
  const otCount = dateLogs.filter(l => l.type === 'check_out' && l.status === 'overtime').length;
  const approvedTotal = employees.filter(e => e.approvalStatus === 'approved').length;

  const departments = Array.from(new Set(employees.map(e => e.department)));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">บันทึกเวลาทำงานแบบเรียลไทม์ (Live Attendance)</h2>
              <span className="flex items-center space-x-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />
                <span>ซิงค์สด 2 ฝั่ง</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ข้อมูลสแกนหน้าจากหน้าตู้ Kiosk จะอัปเดตลงตารางนี้และแจ้งเตือนฝ่ายบัญชีทันทีโดยไม่ต้องรีเฟรชหน้าจอ
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-hidden"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1 cursor-pointer"
              >
                ดูวันนี้
              </button>
            )}
          </div>
        </div>

        {/* Real-time Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl p-3.5">
            <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">เข้างานแล้ววันนี้</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 font-mono mt-0.5">
              {checkedInIds.size} <span className="text-xs font-normal text-blue-600 dark:text-blue-400">/ {approvedTotal} คน</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5">
            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">มาตรงเวลา</div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 font-mono mt-0.5">
              {Math.max(0, checkedInIds.size - lateCount)} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">คน</span>
            </div>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-3.5">
            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">มาสาย (เกินกะ)</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 font-mono mt-0.5">
              {lateCount} <span className="text-xs font-normal text-amber-600 dark:text-amber-400">คน</span>
            </div>
          </div>

          <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-xl p-3.5">
            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">ทำโอที (OT)</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 font-mono mt-0.5">
              {otCount} <span className="text-xs font-normal text-purple-600 dark:text-purple-400">คน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ทั้งหมด ({dateLogs.length})
            </button>
            <button
              onClick={() => setStatusFilter('on_time')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'on_time' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ตรงเวลา
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'late' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              มาสาย
            </button>
            <button
              onClick={() => setStatusFilter('overtime')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'overtime' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ทำ OT
            </button>
          </div>

          {/* Department filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
          >
            <option value="all" className="dark:bg-slate-900 dark:text-white">ทุกแผนก</option>
            {departments.map((dept) => (
              <option key={dept} value={dept} className="dark:bg-slate-900 dark:text-white">{dept}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase">
              <tr>
                <th className="px-4 py-3">เวลาที่สแกน</th>
                <th className="px-4 py-3">พนักงาน</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">สถานะเวลา</th>
                <th className="px-4 py-3">สถานที่ / พิกัด</th>
                <th className="px-4 py-3">ความแม่นยำใบหน้า</th>
                <th className="px-4 py-3">ภาพสแกน</th>
                <th className="px-4 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">ยังไม่มีประวัติการสแกนในเงื่อนไขนี้</p>
                    <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500">เมื่อมีพนักงานสแกนหน้า ข้อมูลจะปรากฏที่นี่ทันที</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isCheckIn = log.type === 'check_in';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {log.time}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">{log.date}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{log.employeeName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.department}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {isCheckIn ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ArrowDownLeft className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                            เข้างาน (In)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <ArrowUpRight className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
                            ออกงาน (Out)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {log.status === 'on_time' && (
                          <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            ตรงเวลา
                          </span>
                        )}
                        {log.status === 'late' && (
                          <span className="inline-flex items-center text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-805">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            สาย {log.lateMinutes} นาที
                          </span>
                        )}
                        {log.status === 'overtime' && (
                          <span className="inline-flex items-center text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                            OT {Math.floor(log.otMinutes / 60)} ชม. {log.otMinutes % 60} น.
                          </span>
                        )}
                        {log.status === 'early_leave' && (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">ออกก่อนเวลา</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {log.locationName ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{log.locationName}</span>
                            </div>
                            {log.distanceMeters !== undefined && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                ห่างจุดเช็คอิน {log.distanceMeters} ม.
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">สำนักงาน</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{log.faceConfidence}%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div 
                          onClick={() => setPreviewPhotoLog(log)}
                          className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer group shadow-2xs"
                        >
                          <img
                            src={log.capturedPhoto}
                            alt="Scan capture"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-3 h-3" />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {previewPhotoLog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 transition-colors">
            <button
              onClick={() => setPreviewPhotoLog(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>ภาพหลักฐานการสแกนใบหน้า (Audit Log)</span>
            </h3>

            <div className="w-full aspect-4/3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 mb-3">
              <img
                src={previewPhotoLog.capturedPhoto}
                alt={previewPhotoLog.employeeName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <div>พนักงาน: <strong className="text-slate-900 dark:text-white">{previewPhotoLog.employeeName}</strong></div>
              <div>เวลาบันทึก: <span className="font-mono font-bold text-slate-900 dark:text-white">{previewPhotoLog.time} ({previewPhotoLog.date})</span></div>
              <div>ประเภท: <span className="font-bold text-blue-700 dark:text-blue-400">{previewPhotoLog.type === 'check_in' ? 'เข้างาน' : 'ออกงาน'}</span></div>
              <div>ความมั่นใจระบบชีวมิติ: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{previewPhotoLog.faceConfidence}%</span></div>
              {previewPhotoLog.locationName && (
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>สถานที่: <strong>{previewPhotoLog.locationName}</strong></span>
                  {previewPhotoLog.distanceMeters !== undefined && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      ({previewPhotoLog.distanceMeters} ม.)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
