import { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { 
  X, Users, Calendar, MapPin, FileText, CheckCircle, 
  XCircle, AlertCircle, Printer, Clock, User, ClipboardList
} from 'lucide-react';

interface MeetingViewModalProps {
  meeting: any;
  group: any;
  onClose: () => void;
}

interface AttendanceRecord {
  id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason: string | null;
  member: {
    id: string;
    name: string;
    surname: string;
    phone: string | null;
  };
}

interface MeetingReport {
  id: string;
  report_text: string;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_at: string | null;
}

const MeetingViewModal: React.FC<MeetingViewModalProps> = ({
  meeting,
  group,
  onClose
}) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [meeting.id]);

  const loadData = async () => {
    try {
      // Load attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          member:members(id, name, surname, phone)
        `)
        .eq('meeting_id', meeting.id);

      if (attendanceError) throw attendanceError;
      setAttendance((attendanceData || []).map(record => ({ ...record, reason: record.notes || null })) as any);

      // Load report
      const { data: reportData, error: reportError } = await supabase
        .from('meeting_reports')
        .select('*')
        .eq('meeting_id', meeting.id)
        .maybeSingle();

      if (!reportError && reportData) {
        setReport(reportData);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const absentWithReason = attendance.filter(a => a.status === 'absent_with_reason').length;
    const total = attendance.length;

    return { present, absent, absentWithReason, total };
  };

  const handlePrint = () => {
    const stats = getAttendanceStats();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Meeting Report - ${group.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333;
                line-height: 1.6;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px solid #333; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
              }
              .header h1 { margin: 0 0 10px 0; }
              .section { 
                margin-bottom: 25px; 
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
              }
              .section h3 { 
                margin: 0 0 10px 0; 
                color: #1e40af;
                border-bottom: 1px solid #ddd;
                padding-bottom: 8px;
              }
              .stats { 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                gap: 15px; 
                margin: 20px 0; 
                text-align: center;
              }
              .stat-card { 
                padding: 15px; 
                border-radius: 8px; 
                color: white;
              }
              .present { background: #10b981; }
              .absent { background: #ef4444; }
              .absent-reason { background: #f59e0b; }
              .total { background: #3b82f6; }
              .attendance-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px;
              }
              .attendance-table th, 
              .attendance-table td { 
                border: 1px solid #ddd; 
                padding: 10px; 
                text-align: left;
              }
              .attendance-table th { 
                background: #f8fafc; 
                font-weight: bold;
              }
              .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 10px; 
              }
              .info-item { 
                padding: 8px; 
                background: #fff; 
                border-radius: 4px; 
              }
              .info-label { font-weight: bold; color: #666; }
              .report-content { 
                white-space: pre-wrap; 
                background: #fff; 
                padding: 12px; 
                border-radius: 4px;
                border-left: 4px solid #3b82f6;
                word-wrap: break-word;
                overflow-wrap: break-word;
                overflow: hidden;
              }
              .decisions { border-left-color: #10b981; }
              .actions { border-left-color: #f59e0b; }
              .section {
                overflow: hidden;
              }
              .section p {
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${group.name} - Meeting Report</h1>
              <p>${new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}</p>
            </div>

            <div class="section">
              <h3>📅 Meeting Details</h3>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Date:</span> ${new Date(meeting.meeting_date).toLocaleDateString()}</div>
                <div class="info-item"><span class="info-label">Time:</span> ${meeting.meeting_time || 'Not specified'}</div>
                <div class="info-item"><span class="info-label">Location:</span> ${meeting.location || 'Not specified'}</div>
                <div class="info-item"><span class="info-label">Status:</span> ${meeting.status}</div>
              </div>
            </div>

            ${meeting.topic ? `
            <div class="section">
              <h3>📌 Topic Discussed</h3>
              <p>${meeting.topic}</p>
            </div>
            ` : ''}

            ${meeting.notes ? `
            <div class="section">
              <h3>📝 Meeting Notes</h3>
              <div class="report-content">${meeting.notes}</div>
            </div>
            ` : ''}

            ${report ? `
            <div class="section">
              <h3>📋 Meeting Summary</h3>
              <div class="report-content">${report.report_text}</div>
            </div>

            ${report.decisions_made ? `
            <div class="section">
              <h3>✅ Decisions Made</h3>
              <div class="report-content decisions">${report.decisions_made}</div>
            </div>
            ` : ''}

            ${report.action_items ? `
            <div class="section">
              <h3>📋 Action Items</h3>
              <div class="report-content actions">${report.action_items}</div>
            </div>
            ` : ''}

            ${report.next_meeting_date ? `
            <div class="section">
              <h3>📅 Next Meeting</h3>
              <p>Scheduled for: ${new Date(report.next_meeting_date).toLocaleDateString()}</p>
            </div>
            ` : ''}
            ` : ''}

            <div class="section">
              <h3>👥 Attendance Summary</h3>
              <div class="stats">
                <div class="stat-card present">
                  <div style="font-size: 24px; font-weight: bold;">${stats.present}</div>
                  <div>Present</div>
                </div>
                <div class="stat-card absent">
                  <div style="font-size: 24px; font-weight: bold;">${stats.absent}</div>
                  <div>Absent</div>
                </div>
                <div class="stat-card absent-reason">
                  <div style="font-size: 24px; font-weight: bold;">${stats.absentWithReason}</div>
                  <div>With Reason</div>
                </div>
                <div class="stat-card total">
                  <div style="font-size: 24px; font-weight: bold;">${stats.total}</div>
                  <div>Total</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>📋 Detailed Attendance</h3>
              <table class="attendance-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Notes/Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendance.map(record => `
                    <tr>
                      <td>${record.member.name} ${record.member.surname}</td>
                      <td>${record.member.phone || '-'}</td>
                      <td style="color: ${record.status === 'present' ? '#10b981' : record.status === 'absent_with_reason' ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
                        ${record.status === 'present' ? '✓ Present' : record.status === 'absent_with_reason' ? '⚠ With Reason' : '✗ Absent'}
                      </td>
                      <td>${record.reason || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
              <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const stats = getAttendanceStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Meeting Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {group.name} - {new Date(meeting.meeting_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div id="meeting-print-content">
            {/* Printable Header */}
            <div className="header text-center mb-8 no-print">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {group.name} - Meeting Report
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {new Date(meeting.meeting_date).toLocaleDateString()}
              </p>
            </div>

            {/* Meeting Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Meeting Date</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                {meeting.meeting_time && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Meeting Time</div>
                      <div className="text-gray-600 dark:text-gray-400">{meeting.meeting_time}</div>
                    </div>
                  </div>
                )}

                {meeting.location && (
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Location</div>
                      <div className="text-gray-600 dark:text-gray-400">{meeting.location}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Attendance Statistics */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Attendance Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.present}</div>
                      <div className="text-sm text-green-600 dark:text-green-400">Present</div>
                    </div>
                    <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absent}</div>
                      <div className="text-sm text-red-600 dark:text-red-400">Absent</div>
                    </div>
                    <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.absentWithReason}</div>
                      <div className="text-sm text-orange-600 dark:text-orange-400">With Reason</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
                    </div>
                  </div>
                </div>

                {/* Meeting Topic */}
                {meeting.topic && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Topic Discussed
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{meeting.topic}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Notes */}
            {meeting.notes && (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Meeting Notes</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}

            {/* Meeting Report Section */}
            {report && (
              <div className="mb-8 space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    Meeting Summary
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">{report.report_text}</p>
                </div>

                {report.decisions_made && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Decisions Made
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">{report.decisions_made}</p>
                  </div>
                )}

                {report.action_items && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 overflow-hidden">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      Action Items
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">{report.action_items}</p>
                  </div>
                )}

                {report.next_meeting_date && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 overflow-hidden">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      Next Meeting
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 break-words">
                      Scheduled for: {new Date(report.next_meeting_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Attendance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Detailed Attendance ({attendance.length} members)
                </h3>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading attendance...</p>
                </div>
              ) : attendance.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No attendance records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {attendance.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {record.member.name} {record.member.surname}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                            {record.member.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {record.status === 'present' && (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">Present</span>
                                </>
                              )}
                              {record.status === 'absent' && (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600 dark:text-red-400 font-medium">Absent</span>
                                </>
                              )}
                              {record.status === 'absent_with_reason' && (
                                <>
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                  <span className="text-orange-600 dark:text-orange-400 font-medium">Absent with Reason</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {record.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Print-only footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500 no-print">
              <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingViewModal;
