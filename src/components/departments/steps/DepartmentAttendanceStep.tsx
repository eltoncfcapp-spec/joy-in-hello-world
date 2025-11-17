import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { Users, CheckCircle, XCircle, FileText, Calendar, Clock } from 'lucide-react';

interface DepartmentAttendanceStepProps {
  department: any;
  meetings: any[];
  selectedMeeting: any;
  onMeetingSelect: (meeting: any) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}

const DepartmentAttendanceStep: React.FC<DepartmentAttendanceStepProps> = ({
  department,
  meetings,
  selectedMeeting,
  onMeetingSelect,
  onAttendanceSaved,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Load department members
  useEffect(() => {
    loadDepartmentMembers();
  }, [department.id]);

  // Load existing attendance when meeting is selected
  useEffect(() => {
    if (selectedMeeting) {
      loadExistingAttendance();
    }
  }, [selectedMeeting]);

  const loadDepartmentMembers = async () => {
    try {
      // Get department members through department_members table
      const { data: departmentMembers, error: deptError } = await supabase
        .from('department_members')
        .select(`
          id,
          role,
          member:members (*)
        `)
        .eq('department_id', department.id)
        .order('role', { ascending: false });

      if (deptError) throw deptError;

      const memberData = departmentMembers?.map(dm => ({
        ...dm.member,
        department_role: dm.role
      })) || [];
      
      setMembers(memberData);
      
      // Initialize all as present
      const initialAttendance: Record<string, 'present'> = {};
      const initialArrivalTimes: Record<string, string> = {};
      memberData?.forEach(member => {
        initialAttendance[member.id] = 'present';
        initialArrivalTimes[member.id] = selectedMeeting?.meeting_time || '';
      });
      setAttendance(initialAttendance);
      setArrivalTimes(initialArrivalTimes);
    } catch (error: any) {
      onError('Failed to load department members: ' + error.message);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);

      if (error) throw error;

      const existingAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      const existingArrivalTimes: Record<string, string> = {};
      const existingNotes: Record<string, string> = {};

      data?.forEach(record => {
        existingAttendance[record.member_id] = record.status as 'present' | 'absent' | 'late';
        if (record.arrival_time) {
          existingArrivalTimes[record.member_id] = record.arrival_time;
        }
        if (record.notes) {
          existingNotes[record.member_id] = record.notes;
        }
      });

      setAttendance(existingAttendance);
      setArrivalTimes(existingArrivalTimes);
      setNotes(existingNotes);
    } catch (error: any) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: status
    }));

    if (status !== 'late') {
      setArrivalTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[memberId];
        return newTimes;
      });
    } else {
      // Set default arrival time for late members
      setArrivalTimes(prev => ({
        ...prev,
        [memberId]: prev[memberId] || selectedMeeting?.meeting_time || ''
      }));
    }
  };

  const handleArrivalTimeChange = (memberId: string, time: string) => {
    setArrivalTimes(prev => ({
      ...prev,
      [memberId]: time
    }));
  };

  const handleNotesChange = (memberId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [memberId]: note
    }));
  };

  const saveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a department meeting first');
      return;
    }

    try {
      setLoading(true);

      // Prepare attendance records according to your schema
      const attendanceRecords = members.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        arrival_time: attendance[member.id] === 'late' ? arrivalTimes[member.id] || null : null,
        notes: notes[member.id] || null,
        created_at: new Date().toISOString()
      }));

      // Delete existing attendance and insert new ones
      await supabase
        .from('department_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      const { error } = await supabase
        .from('department_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      onAttendanceSaved();
    } catch (error: any) {
      onError('Failed to save department attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'leader':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'assistant':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Record Department Attendance</h3>
        <p className="text-gray-600 dark:text-gray-400">Mark department members as present, absent, or late</p>
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
            No department meetings scheduled. Please create a department meeting first.
          </div>
        )}
      </div>

      {/* Attendance Form */}
      {selectedMeeting && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Department Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
            </h4>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {members.length} department members
            </span>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No members found in this department.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Add members to the department first.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(member.department_role)}`}>
                            {member.department_role}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {member.phone} 
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

                        {/* Late Button */}
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'late')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'late'
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                          Late
                        </button>
                      </div>
                    </div>

                    {/* Late Arrival Time Input */}
                    {attendance[member.id] === 'late' && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Arrival Time
                          </label>
                          <input
                            type="time"
                            value={arrivalTimes[member.id] || ''}
                            onChange={(e) => handleArrivalTimeChange(member.id, e.target.value)}
                            className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={notes[member.id] || ''}
                            onChange={(e) => handleNotesChange(member.id, e.target.value)}
                            placeholder="Reason for being late..."
                            className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes for present/absent members */}
                    {(attendance[member.id] === 'present' || attendance[member.id] === 'absent') && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={notes[member.id] || ''}
                          onChange={(e) => handleNotesChange(member.id, e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {loading ? 'Saving Department Attendance...' : 'Save Department Attendance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentAttendanceStep;
