import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Printer,
  Clock, FileText, Save, UserPlus, Mail, Phone,
  Download, FileDown, PlusCircle, Group, Trash2, Edit,
  ChevronLeft, ChevronRight, BarChart3, Settings
} from 'lucide-react';

// Interfaces
interface Department {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
}

interface DepartmentMeeting {
  id: string;
  department_id: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: string | null;
  created_at?: string;
  cancellation_reason?: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  email?: string | null;
  department_role?: string;
  department_member_id?: string;
}

interface DepartmentAttendanceRecord {
  id: string;
  meeting_id: string | null;
  member_id: string | null;
  status: 'present' | 'absent' | 'absent_with_reason' | string | null;
  notes?: string | null;
  members?: Member | null;
}

interface DepartmentReport {
  id: string;
  meeting_id: string | null;
  report_text: string | null;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_at: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  leader_id: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

// Department Meeting Creation Modal
const CreateMeetingModal: React.FC<{
  department: Department;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ department, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: department.location || '',
    topic: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.meeting_date || !formData.meeting_time || !formData.location) {
      onError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const newMeeting = {
        department_id: department.id,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        location: formData.location,
        topic: formData.topic || null,
        notes: formData.notes || null,
        status: 'scheduled'
      };

      const { error } = await supabase
        .from('department_meetings')
        .insert([newMeeting]);

      if (error) throw error;

      onSuccess('Meeting created successfully!');
      onClose();
    } catch (error: any) {
      onError('Failed to create meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Schedule Meeting for {department.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={createMeeting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="meeting_date"
                  value={formData.meeting_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter meeting location"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Topic/Agenda
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What will be discussed in this meeting?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about this meeting..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Schedule Meeting'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Department Attendance Modal
const AttendanceModal: React.FC<{
  department: Department;
  meeting: DepartmentMeeting;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ department, meeting, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'absent_with_reason'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDepartmentMembers();
    loadExistingAttendance();
  }, [department.id, meeting.id]);

  const loadDepartmentMembers = async () => {
    try {
      const { data: departmentMembers, error } = await supabase
        .from('department_members')
        .select(`
          id,
          role,
          member:members (*)
        `)
        .eq('department_id', department.id);

      if (error) throw error;

      const memberData = departmentMembers?.map(dm => ({
        ...dm.member,
        department_role: dm.role,
        department_member_id: dm.id
      })).filter(m => m.id) || [];
      
      setDepartmentMembers(memberData as Member[]);
      
      const initialAttendance: Record<string, 'present'> = {};
      memberData?.forEach(member => {
        if (member.id) initialAttendance[member.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      onError('Failed to load department members: ' + error.message);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select('*')
        .eq('meeting_id', meeting.id);

      if (error) throw error;

      const existingAttendance: Record<string, 'present' | 'absent' | 'absent_with_reason'> = {};
      const existingNotes: Record<string, string> = {};

      data?.forEach(record => {
        if (record.member_id && record.status) {
          existingAttendance[record.member_id] = record.status as 'present' | 'absent' | 'absent_with_reason';
          if (record.notes) {
            existingNotes[record.member_id] = record.notes;
          }
        }
      });

      setAttendance(existingAttendance);
      setNotes(existingNotes);
    } catch (error: any) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'absent_with_reason') => {
    setAttendance(prev => ({ ...prev, [memberId]: status }));
    if (status !== 'absent_with_reason') {
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[memberId];
        return newNotes;
      });
    }
  };

  const handleNotesChange = (memberId: string, note: string) => {
    setNotes(prev => ({ ...prev, [memberId]: note }));
  };

  const saveAttendance = async () => {
    try {
      setLoading(true);
      const attendanceRecords = departmentMembers.map(member => ({
        meeting_id: meeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? notes[member.id] || null : null
      }));

      const { error: deleteError } = await supabase
        .from('department_attendance')
        .delete()
        .eq('meeting_id', meeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('department_attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;
      onSuccess('Attendance saved successfully!');
      onClose();
    } catch (error: any) {
      onError('Failed to save attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'leader': return 'bg-yellow-100 text-yellow-800';
      case 'assistant': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Record Attendance</h3>
            <p className="text-gray-600">
              {department.name} - {new Date(meeting.meeting_date).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Meeting Information</p>
              <p className="text-sm text-blue-700">
                {meeting.topic || 'No topic specified'} • {meeting.location}
              </p>
            </div>
            <span className="text-sm text-blue-700">
              {departmentMembers.length} members
            </span>
          </div>
        </div>

        {departmentMembers.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No members found in this department.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {departmentMembers.map((member) => (
                <div key={member.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-gray-900">
                          {member.name} {member.surname}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(member.department_role || 'member')}`}>
                          {member.department_role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {member.phone}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAttendanceChange(member.id, 'present')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                          attendance[member.id] === 'present'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Present
                      </button>

                      <button
                        onClick={() => handleAttendanceChange(member.id, 'absent')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                          attendance[member.id] === 'absent'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <X className="h-4 w-4" />
                        Absent
                      </button>

                      <button
                        onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                          attendance[member.id] === 'absent_with_reason'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        With Notes
                      </button>
                    </div>
                  </div>

                  {attendance[member.id] === 'absent_with_reason' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes for Absence</label>
                      <input
                        type="text"
                        value={notes[member.id] || ''}
                        onChange={(e) => handleNotesChange(member.id, e.target.value)}
                        placeholder="Enter notes for absence..."
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-orange-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAttendance}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Department Report Modal
const ReportModal: React.FC<{
  department: Department;
  meeting: DepartmentMeeting;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ department, meeting, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<DepartmentAttendanceRecord[]>([]);
  const [existingReport, setExistingReport] = useState<DepartmentReport | null>(null);
  const [reportData, setReportData] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: '',
    additional_notes: ''
  });

  useEffect(() => {
    loadAttendanceData();
    loadExistingReport();
  }, [meeting.id]);

  const loadAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members:member_id (
            id,
            name,
            surname,
            email,
            phone
          )
        `)
        .eq('meeting_id', meeting.id);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
    }
  };

  const loadExistingReport = async () => {
    try {
      const { data, error } = await supabase
        .from('department_reports')
        .select('*')
        .eq('meeting_id', meeting.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setExistingReport(data);
        setReportData({
          report_text: data.report_text || '',
          decisions_made: data.decisions_made || '',
          action_items: data.action_items || '',
          next_meeting_date: data.next_meeting_date || '',
          additional_notes: ''
        });
      }
    } catch (error: any) {
      console.error('Failed to load existing report:', error);
    }
  };

  const handleReportChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateReport = async () => {
    try {
      setLoading(true);

      const reportPayload = {
        meeting_id: meeting.id,
        report_text: reportData.report_text,
        decisions_made: reportData.decisions_made || null,
        action_items: reportData.action_items || null,
        next_meeting_date: reportData.next_meeting_date || null
      };

      let error;
      
      if (existingReport) {
        const { error: updateError } = await supabase
          .from('department_reports')
          .update(reportPayload)
          .eq('id', existingReport.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('department_reports')
          .insert([reportPayload]);
        error = insertError;
      }

      if (error) throw error;

      await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', meeting.id);

      onSuccess('Report generated successfully!');
      onClose();
    } catch (error: any) {
      onError('Failed to generate report: ' + error.message);
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

  const stats = getAttendanceStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Generate Report</h3>
            <p className="text-gray-600">
              {department.name} - {new Date(meeting.meeting_date).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800">Present</span>
                  </div>
                  <span className="text-lg font-bold text-green-800">
                    {stats.present}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">Absent</span>
                  </div>
                  <span className="text-lg font-bold text-red-800">
                    {stats.absent}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800">Absent with Notes</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-800">
                    {stats.absentWithReason}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800">Total</span>
                  </div>
                  <span className="text-lg font-bold text-blue-800">
                    {stats.total}
                  </span>
                </div>
              </div>

              {stats.total > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round((stats.present / stats.total) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Meeting Report</h4>
                {existingReport && (
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Report Exists
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Report *
                  </label>
                  <textarea
                    name="report_text"
                    value={reportData.report_text}
                    onChange={handleReportChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Detailed report of what was discussed and accomplished..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decisions Made
                  </label>
                  <textarea
                    name="decisions_made"
                    value={reportData.decisions_made}
                    onChange={handleReportChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Important decisions, approvals, or resolutions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Items
                  </label>
                  <textarea
                    name="action_items"
                    value={reportData.action_items}
                    onChange={handleReportChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tasks assigned, follow-ups, or next steps..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Meeting Date
                  </label>
                  <input
                    type="date"
                    name="next_meeting_date"
                    value={reportData.next_meeting_date}
                    onChange={handleReportChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="additional_notes"
                    value={reportData.additional_notes}
                    onChange={handleReportChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any other relevant information..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateReport}
                  disabled={loading || !reportData.report_text.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  {loading ? 'Generating...' : existingReport ? 'Update Report' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Member to Department Modal
const AddMemberModal: React.FC<{
  department: Department;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ department, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [churchMembers, setChurchMembers] = useState<Member[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChurchMembers();
    loadDepartmentMembers();
  }, [department.id]);

  const loadChurchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setChurchMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load church members:', error);
    }
  };

  const loadDepartmentMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('department_members')
        .select('member_id')
        .eq('department_id', department.id);

      if (error) throw error;
      setDepartmentMembers(data?.map(dm => ({ id: dm.member_id } as Member)) || []);
    } catch (error: any) {
      console.error('Failed to load department members:', error);
    }
  };

  const addMemberToDepartment = async (member: Member) => {
    try {
      setLoading(true);
      
      const isAlreadyMember = departmentMembers.some(dm => dm.id === member.id);
      if (isAlreadyMember) {
        onError('Member is already in this department');
        return;
      }

      const { error } = await supabase
        .from('department_members')
        .insert([{ department_id: department.id, member_id: member.id, role: 'member' }]);

      if (error) throw error;

      await loadDepartmentMembers();
      onSuccess(`Added ${member.name} ${member.surname} to ${department.name}`);
    } catch (error: any) {
      onError('Failed to add member to department: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = churchMembers.filter(member =>
    !departmentMembers.some(dm => dm.id === member.id) && (
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Add Members to {department.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search church members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No members found matching your search' : 'No church members available to add'}
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{member.name} {member.surname}</div>
                    <div className="text-sm text-gray-600">{member.phone}</div>
                    {member.email && (
                      <div className="text-sm text-gray-600">{member.email}</div>
                    )}
                  </div>
                  <button
                    onClick={() => addMemberToDepartment(member)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Add to Department
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Create Group Modal
const CreateGroupModal: React.FC<{
  departments: Department[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ departments, onClose, onSuccess, onError }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department_id: '',
    meeting_day: '',
    meeting_time: '',
    location: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      onError('Group name is required');
      return;
    }

    try {
      setLoading(true);

      const groupPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        department_id: formData.department_id || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        location: formData.location || null,
        leader_id: profile?.id || null
      };

      const { data, error } = await supabase
        .from('groups')
        .insert([groupPayload])
        .select()
        .single();

      if (error) throw error;

      // Add creator as group leader if logged in
      if (profile?.id) {
        await supabase
          .from('group_members')
          .insert([{
            group_id: data.id,
            member_id: profile.id,
            role: 'leader'
          }]);
      }

      onSuccess(`Group "${formData.name}" created successfully!`);
      onClose();
    } catch (error: any) {
      onError('Failed to create group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const canCreateGroup = () => {
    if (!profile) return false;
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor';
  };

  if (!canCreateGroup()) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-6">
              Only administrators and pastors can create groups.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Create New Group</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={createGroup} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <div className="relative">
              <Group className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose of this group..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associated Department (Optional)
              </label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a department...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Day (Optional)
              </label>
              <select
                name="meeting_day"
                value={formData.meeting_day}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select day...</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Meeting location"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Manage Department Modal
const ManageDepartmentModal: React.FC<{
  department: Department;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}> = ({ department, onClose, onSuccess, onError }) => {
  const [activeTab, setActiveTab] = useState('meetings');
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'meetings') {
      loadMeetings();
    } else if (activeTab === 'members') {
      loadDepartmentMembers();
    }
  }, [activeTab, department.id]);

  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', department.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error('Failed to load meetings:', error);
    }
  };

  const loadDepartmentMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('department_members')
        .select(`
          id,
          role,
          member:members (*)
        `)
        .eq('department_id', department.id);

      if (error) throw error;

      const memberData = error ? [] : data?.map(dm => ({
        ...dm.member,
        department_role: dm.role,
        department_member_id: dm.id
      })).filter(m => m.id) || [];
      
      setDepartmentMembers(memberData as Member[]);
    } catch (error: any) {
      console.error('Failed to load department members:', error);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('department_meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      
      onSuccess('Meeting deleted successfully!');
      await loadMeetings();
    } catch (error: any) {
      onError('Failed to delete meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the department?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('department_members')
        .delete()
        .eq('department_id', department.id)
        .eq('member_id', memberId);

      if (error) throw error;
      
      onSuccess('Member removed successfully!');
      await loadDepartmentMembers();
    } catch (error: any) {
      onError('Failed to remove member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('department_members')
        .update({ role: newRole })
        .eq('department_id', department.id)
        .eq('member_id', memberId);

      if (error) throw error;
      
      onSuccess('Member role updated successfully!');
      await loadDepartmentMembers();
    } catch (error: any) {
      onError('Failed to update member role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Manage {department.name}</h3>
            <p className="text-gray-600">
              {department.memberCount || 0} members • {department.location || 'No location specified'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Meetings Tab */}
        {activeTab === 'meetings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-900">Department Meetings</h4>
              <button
                onClick={() => {
                  // Open create meeting modal
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Schedule Meeting
              </button>
            </div>

            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No meetings scheduled</p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(meeting.meeting_date).toLocaleDateString()}
                          {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {meeting.topic || 'No topic specified'} • {meeting.location}
                        </div>
                        {meeting.notes && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {meeting.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meeting.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : meeting.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {meeting.status || 'scheduled'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {/* Open edit meeting modal */}}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            disabled={loading}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-900">
                Department Members ({departmentMembers.length})
              </h4>
              <button
                onClick={() => {
                  // Open add member modal
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentMembers.length === 0 ? (
                <div className="col-span-full text-center py-8 bg-gray-50 rounded-xl">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No members in this department</p>
                </div>
              ) : (
                departmentMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {member.name?.[0]}{member.surname?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-sm text-gray-600">{member.phone}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <select
                        value={member.department_role || 'member'}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        disabled={loading}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                      >
                        <option value="member">Member</option>
                        <option value="assistant">Assistant</option>
                        <option value="leader">Leader</option>
                      </select>
                      
                      <button
                        onClick={() => removeMember(member.id)}
                        disabled={loading}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove from department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-6">Department Settings</h4>
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  defaultValue={department.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  defaultValue={department.location || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department location"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Day
                  </label>
                  <select
                    defaultValue={department.meeting_day || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select day...</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Time
                  </label>
                  <input
                    type="time"
                    defaultValue={department.meeting_time || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  defaultValue={department.description || ''}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the department's purpose and activities..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save settings
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Departments Component
const Departments = () => {
  const { profile } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showManageDepartmentModal, setShowManageDepartmentModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  
  // Data states
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    loadDepartments();
    loadGroups();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;
      
      const departmentsWithMemberCounts = await Promise.all(
        (departmentsData || []).map(async (department) => {
          const { count } = await supabase
            .from('department_members')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', department.id);

          return {
            ...department,
            memberCount: count || 0
          } as Department;
        })
      );

      setDepartments(departmentsWithMemberCounts);
    } catch (error: any) {
      setError('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadMeetings = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', departmentId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      setError('Failed to load meetings: ' + error.message);
    }
  };

  const openMeetingsModal = async (department: Department) => {
    setSelectedDepartment(department);
    setShowMeetingsModal(true);
    await loadMeetings(department.id);
  };

  const openCreateMeetingModal = (department: Department) => {
    setSelectedDepartment(department);
    setShowCreateMeetingModal(true);
  };

  const openAttendanceModal = (department: Department, meeting: DepartmentMeeting) => {
    setSelectedDepartment(department);
    setSelectedMeeting(meeting);
    setShowAttendanceModal(true);
  };

  const openReportModal = (department: Department, meeting: DepartmentMeeting) => {
    setSelectedDepartment(department);
    setSelectedMeeting(meeting);
    setShowReportModal(true);
  };

  const openAddMemberModal = (department: Department) => {
    setSelectedDepartment(department);
    setShowAddMemberModal(true);
  };

  const openManageDepartmentModal = (department: Department) => {
    setSelectedDepartment(department);
    setShowManageDepartmentModal(true);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowCreateMeetingModal(false);
    setShowAttendanceModal(false);
    setShowReportModal(false);
    setShowAddMemberModal(false);
    setShowManageDepartmentModal(false);
    setShowCreateGroupModal(false);
    setShowGroupsModal(false);
    setSelectedDepartment(null);
    setSelectedMeeting(null);
  };

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const adminRole = profile.admin_role || 'member';
    if (adminRole === 'admin' || adminRole === 'administrator') return 'Administrator';
    if (adminRole === 'pastor') return 'Pastor';
    if (adminRole === 'deacon') return 'Deacon';
    if (adminRole === 'department_leader') return 'Department Leader';
    if (adminRole === 'group_leader') return 'Group Leader';
    return 'Member';
  };

  const canCreateGroup = () => {
    if (!profile) return false;
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor';
  };

  const canManageDepartment = (deptId: string) => {
    if (!profile) return false;
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor' || adminRole === 'department_leader';
  };

  const canViewDepartment = (deptId: string) => {
    if (!profile) return false;
    return true; // All logged in users can view
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
    loadDepartments(); // Refresh data
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Departments
            </h1>
            <p className="text-gray-600">
              {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view departments'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {canCreateGroup() && (
              <>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Group className="h-4 w-4" />
                  Create Group
                </button>
                <button
                  onClick={() => setShowGroupsModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  View Groups ({groups.length})
                </button>
              </>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Departments Grid */}
        {!profile ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Please Log In
            </h3>
            <p className="text-gray-500 mb-6">
              You need to be logged in to view departments
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {loading && filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading departments...</p>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No departments found' : 'No departments available'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try a different search term' : 'No departments have been created yet'}
                </p>
              </div>
            ) : (
              filteredDepartments.map((department) => {
                const canManage = canManageDepartment(department.id);
                const canView = canViewDepartment(department.id);
                
                return (
                  <div
                    key={department.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 md:gap-4 mb-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Users className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{department.name}</h3>
                        {canManage ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <Shield className="h-3 w-3 mr-1" />
                            Can Manage
                          </span>
                        ) : canView ? (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            <Shield className="h-3 w-3 mr-1" />
                            View Only
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 mb-4">
                      {department.location && (
                        <div className="flex items-center gap-2 md:gap-3 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{department.location}</span>
                        </div>
                      )}
                      
                      {(department.meeting_day || department.meeting_time) && (
                        <div className="flex items-center gap-2 md:gap-3 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {department.meeting_day} {department.meeting_time && `at ${department.meeting_time}`}
                          </span>
                        </div>
                      )}
                      
                      {department.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {department.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">
                        {department.memberCount || 0} member{(department.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(department)}
                          className="px-3 py-1 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
                        >
                          View Meetings
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openManageDepartmentModal(department)}
                            className="px-3 py-1 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm font-medium"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Meetings Modal */}
        {showMeetingsModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl md:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                  {selectedDepartment.name} - Meetings
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
                </div>
                {canManageDepartment(selectedDepartment.id) && (
                  <button
                    onClick={() => {
                      setShowMeetingsModal(false);
                      openCreateMeetingModal(selectedDepartment);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Schedule Meeting
                  </button>
                )}
              </div>

              <div className="space-y-3 md:space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No meetings scheduled</p>
                    {canManageDepartment(selectedDepartment.id) && (
                      <button
                        onClick={() => {
                          setShowMeetingsModal(false);
                          openCreateMeetingModal(selectedDepartment);
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Schedule First Meeting
                      </button>
                    )}
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(meeting.meeting_date).toLocaleDateString()}
                            {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                          </div>
                          {meeting.topic && (
                            <div className="text-sm text-gray-600 mt-1">
                              Topic: {meeting.topic}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Location: {meeting.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : meeting.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {meeting.status || 'scheduled'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {canManageDepartment(selectedDepartment.id) && meeting.status !== 'completed' && (
                          <button
                            onClick={() => openAttendanceModal(selectedDepartment, meeting)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Take Attendance
                          </button>
                        )}
                        
                        {meeting.status === 'completed' && (
                          <button
                            onClick={() => openReportModal(selectedDepartment, meeting)}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                          >
                            View Report
                          </button>
                        )}

                        {canManageDepartment(selectedDepartment.id) && (
                          <>
                            <button
                              onClick={() => {/* Edit meeting */}}
                              className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this meeting?')) {
                                  // Delete meeting
                                }
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Meeting Modal */}
        {showCreateMeetingModal && selectedDepartment && (
          <CreateMeetingModal
            department={selectedDepartment}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && selectedDepartment && selectedMeeting && (
          <AttendanceModal
            department={selectedDepartment}
            meeting={selectedMeeting}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Report Modal */}
        {showReportModal && selectedDepartment && selectedMeeting && (
          <ReportModal
            department={selectedDepartment}
            meeting={selectedMeeting}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && selectedDepartment && (
          <AddMemberModal
            department={selectedDepartment}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Manage Department Modal */}
        {showManageDepartmentModal && selectedDepartment && (
          <ManageDepartmentModal
            department={selectedDepartment}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <CreateGroupModal
            departments={departments}
            onClose={closeAllModals}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        )}

        {/* Groups Modal (Simplified) */}
        {showGroupsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Church Groups</h3>
                <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <Group className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No groups created yet</p>
                    {canCreateGroup() && (
                      <button
                        onClick={() => {
                          setShowGroupsModal(false);
                          setShowCreateGroupModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create First Group
                      </button>
                    )}
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                          <Group className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          {group.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {(group.meeting_day || group.location) && (
                        <div className="text-sm text-gray-500">
                          {group.meeting_day && <span>{group.meeting_day} </span>}
                          {group.meeting_time && <span>at {group.meeting_time} </span>}
                          {group.location && <span>• {group.location}</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
