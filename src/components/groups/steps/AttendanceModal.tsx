import { useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client';
import { X, CheckCircle, XCircle, FileText, Save } from 'lucide-react';

interface AttendanceModalProps {
  meeting: any;
  group: any;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  meeting,
  group,
  onClose,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'absent_with_reason'>>({});
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadGroupMembers();
    loadExistingAttendance();
  }, [meeting.id]);

  const loadGroupMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname, phone')
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
        .eq('meeting_id', meeting.id);

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
    try {
      setLoading(true);

      // Prepare attendance records
      const attendanceRecords = members.map(member => ({
        meeting_id: meeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? absenceReasons[member.id] || '' : null
      }));

      // Delete existing attendance and insert new ones
      await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', meeting.id);

      const { error } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      onSuccess('Attendance saved successfully!');
      onClose();
    } catch (error: any) {
      onError('Failed to save attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Record Attendance
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {group.name} - {new Date(meeting.meeting_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mark attendance for {members.length} members
              </h4>
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
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModal;
