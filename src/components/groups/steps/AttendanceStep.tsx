import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { Users, CheckCircle, XCircle, FileText, Calendar } from 'lucide-react';

interface AttendanceStepProps {
  group: any;
  meetings: any[];
  selectedMeeting: any;
  onMeetingSelect: (meeting: any) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}

const AttendanceStep: React.FC<AttendanceStepProps> = ({
  group,
  meetings,
  selectedMeeting,
  onMeetingSelect,
  onAttendanceSaved,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'absent_with_reason'>>({});
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});

  // Load group members
  useEffect(() => {
    loadGroupMembers();
  }, [group.id]);

  // Load existing attendance when meeting is selected
  useEffect(() => {
    if (selectedMeeting) {
      loadExistingAttendance();
    }
  }, [selectedMeeting]);

  const loadGroupMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', group.id)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
      
      // Initialize all as present
      const initialAttendance: Record<string, 'present'> = {};
      data?.forEach(member => {
        initialAttendance[member.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      onError('Failed to load group members: ' + error.message);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);

      if (error) throw error;

      const existingAttendance: Record<string, 'present' | 'absent' | 'absent_with_reason'> = {};
      const existingReasons: Record<string, string> = {};

      data?.forEach((record: any) => {
        if (record.member_id) {
          existingAttendance[record.member_id] = record.status as 'present' | 'absent' | 'absent_with_reason';
          if (record.notes) {
            existingReasons[record.member_id] = record.notes;
          }
        }
      });

      setAttendance(existingAttendance);
      setAbsenceReasons(existingReasons);
    } catch (error: any) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'absent_with_reason') => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: status
    }));

    if (status !== 'absent_with_reason') {
      setAbsenceReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[memberId];
        return newReasons;
      });
    }
  };

  const handleReasonChange = (memberId: string, reason: string) => {
    setAbsenceReasons(prev => ({
      ...prev,
      [memberId]: reason
    }));
  };

  const saveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    try {
      setLoading(true);

      // Prepare attendance records
      const attendanceRecords = members.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? absenceReasons[member.id] || '' : null
      }));

      // Delete existing attendance and insert new ones
      await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      const { error } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      onAttendanceSaved();
    } catch (error: any) {
      onError('Failed to save attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Record Attendance</h3>
        <p className="text-gray-600 dark:text-gray-400">Mark members as present, absent, or absent with reason</p>
      </div>

      {/* Meeting Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Meeting *
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
            No meetings scheduled. Please create a meeting first.
          </div>
        )}
      </div>

      {/* Attendance Form */}
      {selectedMeeting && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
            </h4>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {members.length} members
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {member.name} {member.surname}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {member.phone} • {member.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Present Button */}
                    <button
                      onClick={() => handleAttendanceChange(member.id, 'present')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        attendance[member.id] === 'present'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Present
                    </button>

                    {/* Absent Button */}
                    <button
                      onClick={() => handleAttendanceChange(member.id, 'absent')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        attendance[member.id] === 'absent'
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Absent
                    </button>

                    {/* Absent with Reason Button */}
                    <button
                      onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        attendance[member.id] === 'absent_with_reason'
                          ? 'bg-orange-600 text-white shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      With Reason
                    </button>
                  </div>
                </div>

                {/* Reason Input */}
                {attendance[member.id] === 'absent_with_reason' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={absenceReasons[member.id] || ''}
                      onChange={(e) => handleReasonChange(member.id, e.target.value)}
                      placeholder="Enter reason for absence..."
                      className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-6">
            <button
              onClick={saveAttendance}
              disabled={loading}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceStep;
