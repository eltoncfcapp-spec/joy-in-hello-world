import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Users, CheckCircle, X, FileText, Calendar, Clock, UserPlus, Search, Save } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface DepartmentMeeting {
  id: string;
  meeting_date: string;
  meeting_time: string | null;
  topic: string | null;
  status: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  department_role?: string;
  status?: string;
}

interface DepartmentAttendanceStepProps {
  department: Department;
  meetings: DepartmentMeeting[];
  selectedMeeting: DepartmentMeeting | null;
  onMeetingSelect: (meeting: DepartmentMeeting) => void;
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
  const [saving, setSaving] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);
  const [allChurchMembers, setAllChurchMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'absent_with_reason'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false);
  const [searchMemberTerm, setSearchMemberTerm] = useState('');

  useEffect(() => {
    if (department.id) {
      loadDepartmentMembers();
      loadAllChurchMembers();
    }
  }, [department.id]);

  useEffect(() => {
    if (selectedMeeting) {
      loadExistingAttendance();
    }
  }, [selectedMeeting]);

  const loadDepartmentMembers = async () => {
    try {
      setLoading(true);
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
        department_role: dm.role,
        department_member_id: dm.id
      })) || [];
      
      setDepartmentMembers(memberData);
      
      // Initialize all as present
      const initialAttendance: Record<string, 'present'> = {};
      memberData?.forEach(member => {
        initialAttendance[member.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      onError('Failed to load department members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllChurchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAllChurchMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load all church members:', error);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting?.id);

      if (error) throw error;

      const existingAttendance: Record<string, 'present' | 'absent' | 'absent_with_reason'> = {};
      const existingNotes: Record<string, string> = {};

      data?.forEach(record => {
        existingAttendance[record.member_id] = record.status;
        if (record.notes) {
          existingNotes[record.member_id] = record.notes;
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
      setShowAddAttendeeModal(false);
      setSearchMemberTerm('');
      setAttendance(prev => ({ ...prev, [member.id]: 'present' }));
      onError('Member added to department successfully!');
    } catch (error: any) {
      onError('Failed to add member to department: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a department meeting first');
      return;
    }

    try {
      setSaving(true);
      const attendanceRecords = departmentMembers.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? notes[member.id] || null : null
      }));

      // Delete existing attendance and insert new ones
      const { error: deleteError } = await supabase
        .from('department_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('department_attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      // Update meeting status to completed
      const { error: updateError } = await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      if (updateError) throw updateError;

      onAttendanceSaved();
    } catch (error: any) {
      onError('Failed to save department attendance: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'leader': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'assistant': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'coordinator': return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'absent_with_reason': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCount = (status: string) => {
    return Object.values(attendance).filter(s => s === status).length;
  };

  const filteredChurchMembers = allChurchMembers.filter(member =>
    !departmentMembers.some(dm => dm.id === member.id) && (
      member.name.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchMemberTerm.toLowerCase())
    )
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Record Department Attendance</h3>
        <p className="text-gray-600">Mark department members as present, absent, or absent with notes</p>
      </div>

      {/* Meeting Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Department Meeting *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.filter(m => m.status === 'scheduled' || m.status === 'completed').map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => onMeetingSelect(meeting)}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                selectedMeeting?.id === meeting.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {new Date(meeting.meeting_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="h-3 w-3" />
                {meeting.meeting_time}
              </div>
              {meeting.topic && (
                <p className="text-sm text-gray-600 truncate">{meeting.topic}</p>
              )}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-2 ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {meeting.status}
              </div>
            </button>
          ))}
        </div>
        {meetings.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No department meetings scheduled.</p>
            <p className="text-sm">Please create a department meeting first.</p>
          </div>
        )}
      </div>

      {selectedMeeting && (
        <div className="space-y-6">
          {/* Header with Stats */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                Department Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              </h4>
              {selectedMeeting.topic && (
                <p className="text-gray-600 text-sm mt-1">Topic: {selectedMeeting.topic}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Attendance Summary</div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600">Present: {getStatusCount('present')}</span>
                  <span className="text-red-600">Absent: {getStatusCount('absent')}</span>
                  <span className="text-orange-600">With Notes: {getStatusCount('absent_with_reason')}</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          </div>

          {departmentMembers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No members found in this department.</p>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Members to Department
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {departmentMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium text-gray-900">
                            {member.name} {member.surname}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(member.department_role || 'member')}`}>
                            {member.department_role}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(attendance[member.id])}`}>
                            {attendance[member.id] || 'present'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {member.email && <div>✉️ {member.email}</div>}
                          {member.phone && <div>📞 {member.phone}</div>}
                          {member.status && (
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              member.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.status}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'present')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                            attendance[member.id] === 'present'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Present
                        </button>

                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                            attendance[member.id] === 'absent'
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <X className="h-4 w-4" />
                          Absent
                        </button>

                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                            attendance[member.id] === 'absent_with_reason'
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          With Notes
                        </button>
                      </div>
                    </div>

                    {attendance[member.id] === 'absent_with_reason' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes for Absence</label>
                        <input
                          type="text"
                          value={notes[member.id] || ''}
                          onChange={(e) => handleNotesChange(member.id, e.target.value)}
                          placeholder="Enter reason for absence..."
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-orange-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-6 border-t border-gray-200">
                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="flex items-center gap-3 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving Department Attendance...' : 'Save Department Attendance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddAttendeeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Member to {department.name}</h3>
              <button 
                onClick={() => setShowAddAttendeeModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search church members by name, surname, or email..."
                  value={searchMemberTerm}
                  onChange={(e) => setSearchMemberTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredChurchMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchMemberTerm ? 'No members found matching your search' : 'No church members available to add'}
                </div>
              ) : (
                filteredChurchMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{member.name} {member.surname}</div>
                        <div className="text-sm text-gray-600">
                          {member.email && <span>{member.email}</span>}
                          {member.email && member.phone && <span> • </span>}
                          {member.phone && <span>{member.phone}</span>}
                        </div>
                        {member.status && (
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${
                            member.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status}
                          </div>
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
      )}
    </div>
  );
};

export default DepartmentAttendanceStep;
