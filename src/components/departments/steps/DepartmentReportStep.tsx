import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { useNotifications } from '../../../hooks/useNotifications';
import { FileText, Users, CheckCircle, XCircle, AlertCircle, Download, Printer, Calendar, MapPin, Clock } from 'lucide-react';

interface DepartmentReportStepProps {
  department: any;
  meetings: any[];
  selectedMeeting: any;
  onMeetingSelect: (meeting: any) => void;
  onReportCreated: () => void;
  onError: (message: string) => void;
}

const DepartmentReportStep: React.FC<DepartmentReportStepProps> = ({
  department,
  meetings,
  selectedMeeting,
  onMeetingSelect,
  onReportCreated,
  onError
}) => {
  const { sendLocalNotification, permission } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [reportData, setReportData] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: '',
    additional_notes: ''
  });

  useEffect(() => {
    if (selectedMeeting) {
      loadAttendanceData();
    }
  }, [selectedMeeting]);

  const loadAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          status,
          arrival_time,
          notes,
          member:members (*)
        `)
        .eq('meeting_id', selectedMeeting.id);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      onError('Failed to load attendance data: ' + error.message);
    }
  };

  const handleReportChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendReportNotification = async () => {
    // Send local notification - simple message
    if (permission === 'granted') {
      await sendLocalNotification(`${department?.name || 'Department'} Report Finalized`, {
        body: 'Meeting report has been submitted.',
        tag: `dept-report-${selectedMeeting?.id}`,
        data: { url: '/departments' }
      });
    }
  };

  const generateReport = async () => {
    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    try {
      setLoading(true);

      // Create department report
      const { error } = await supabase
        .from('department_reports')
        .insert([{
          meeting_id: selectedMeeting.id,
          report_text: reportData.report_text,
          decisions_made: reportData.decisions_made,
          action_items: reportData.action_items,
          next_meeting_date: reportData.next_meeting_date || null
        }]);

      if (error) throw error;

      // Update meeting status to completed
      await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      // Send notification about the new report
      await sendReportNotification();

      onReportCreated();
    } catch (error: any) {
      onError('Failed to generate department report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadReport = () => {
    const stats = getAttendanceStats();
    const reportContent = `
Department Meeting Report
${department.name}
Date: ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString() : 'N/A'}
Time: ${selectedMeeting?.meeting_time || 'N/A'}
Location: ${selectedMeeting?.location || department.location || 'N/A'}

ATTENDANCE SUMMARY
Total Members: ${stats.total}
Present: ${stats.present} (${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)
Absent: ${stats.absent} (${stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)
Late: ${stats.late} (${stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%)

MEETING REPORT
${reportData.report_text || 'No report text recorded'}

DECISIONS MADE
${reportData.decisions_made || 'No decisions recorded'}

ACTION ITEMS
${reportData.action_items || 'No action items recorded'}

NEXT MEETING
${reportData.next_meeting_date ? `Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString()}` : 'No next meeting date set'}

ADDITIONAL NOTES
${reportData.additional_notes || 'No additional notes'}

ATTENDANCE DETAILS
${attendance.map(a => `
${a.member.name} ${a.member.surname} - ${a.status.toUpperCase()}${a.arrival_time ? ` (Arrived: ${a.arrival_time})` : ''}${a.notes ? ` - Notes: ${a.notes}` : ''}
`).join('')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-report-${department.name}-${selectedMeeting?.meeting_date || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAttendanceStats = () => {
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const total = attendance.length;

    return { present, absent, late, total };
  };

  const stats = getAttendanceStats();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Department Report</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Generate a comprehensive report for the {department.name} department meeting
        </p>
      </div>

      {/* Meeting Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Department Meeting *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.filter(m => m.status === 'scheduled' || m.status === 'completed').map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => onMeetingSelect(meeting)}
              className={`p-4 border rounded-xl text-left transition-all duration-200 ${
                selectedMeeting?.id === meeting.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(meeting.meeting_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Clock className="h-3 w-3" />
                {meeting.meeting_time}
              </div>
              {meeting.topic && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {meeting.topic}
                </p>
              )}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-2 ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {meeting.status}
              </div>
            </button>
          ))}
        </div>
        {meetings.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No department meetings available for reporting.
          </div>
        )}
      </div>

      {selectedMeeting && (
        <>
          {/* Meeting Information */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meeting Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedMeeting.location || department.location || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Topic</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedMeeting.topic || 'General Department Meeting'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Summary</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 dark:text-green-200">Present</span>
                    </div>
                    <span className="text-lg font-bold text-green-800 dark:text-green-200">
                      {stats.present}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 dark:text-red-200">Absent</span>
                    </div>
                    <span className="text-lg font-bold text-red-800 dark:text-red-200">
                      {stats.absent}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-800 dark:text-yellow-200">Late</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                      {stats.late}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 dark:text-blue-200">Total</span>
                    </div>
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {stats.total}
                    </span>
                  </div>
                </div>

                {/* Attendance Rate */}
                {stats.total > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round((stats.present / stats.total) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 print:hidden">
                <button
                  onClick={downloadReport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>

            {/* Report Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Meeting Report</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Report *
                    </label>
                    <textarea
                      name="report_text"
                      value={reportData.report_text}
                      onChange={handleReportChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Detailed report of what was discussed and accomplished..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Decisions Made
                    </label>
                    <textarea
                      name="decisions_made"
                      value={reportData.decisions_made}
                      onChange={handleReportChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Important decisions, approvals, or resolutions..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Action Items
                    </label>
                    <textarea
                      name="action_items"
                      value={reportData.action_items}
                      onChange={handleReportChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tasks assigned, follow-ups, or next steps..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Next Meeting Date
                      </label>
                      <input
                        type="date"
                        name="next_meeting_date"
                        value={reportData.next_meeting_date}
                        onChange={handleReportChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      name="additional_notes"
                      value={reportData.additional_notes}
                      onChange={handleReportChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any other relevant information..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={generateReport}
                    disabled={loading || !selectedMeeting || !reportData.report_text.trim()}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Generating Report...' : 'Generate Department Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentReportStep;
