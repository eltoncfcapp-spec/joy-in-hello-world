import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Plus, Printer,
  Clock, FileText, Save, UserPlus, Mail, Phone,
  Edit, Trash2, CheckSquare, Square, Ban
} from 'lucide-react';

// Simple interfaces for departments
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
  department_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  cancellation_reason?: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  department_id?: string | null;
}

interface DepartmentAttendanceRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason?: string | null;
  members?: Member;
}

// Department Member Management Component
const DepartmentMemberManagement = ({
  department,
  currentMembers,
  allMembers,
  onMembersUpdated,
  onError
}: {
  department: Department;
  currentMembers: Member[];
  allMembers: Member[];
  onMembersUpdated: () => void;
  onError: (message: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter available members (not already in department)
  const availableMembers = allMembers.filter(
    member => !currentMembers.some(cm => cm.id === member.id)
  );

  const filteredAvailableMembers = availableMembers.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMemberToDepartment = async (memberId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('department_members')
        .insert([{
          department_id: department.id,
          member_id: memberId,
          role: 'member'
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setSearchTerm('');
      onMembersUpdated();
    } catch (error: any) {
      onError('Failed to add member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMemberFromDepartment = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the department?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('department_members')
        .delete()
        .eq('department_id', department.id)
        .eq('member_id', memberId);

      if (error) throw error;

      onMembersUpdated();
    } catch (error: any) {
      onError('Failed to remove member: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Manage Department Members</h3>
        <p className="text-gray-600">Add or remove members from {department.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Current Members ({currentMembers.length})
          </h4>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        {currentMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No members in this department yet
          </div>
        ) : (
          <div className="space-y-3">
            {currentMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.name} {member.surname}
                    </div>
                    {member.email && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    )}
                    {member.phone && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeMemberFromDepartment(member.id)}
                  disabled={loading}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Member to Department</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchTerm('');
                }}
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
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              {availableMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  All members are already in this department
                </div>
              ) : filteredAvailableMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No members found matching your search
                </div>
              ) : (
                filteredAvailableMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.name} {member.surname}
                        </div>
                        {member.email && (
                          <div className="text-sm text-gray-600">{member.email}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => addMemberToDepartment(member.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
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

// Department Meeting Creation Step
const DepartmentMeetingCreationStep = ({ department, onMeetingCreated, onError }: { 
  department: Department; 
  onMeetingCreated: () => void; 
  onError: (message: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: department.location || '',
    topic: '',
    notes: ''
  });
  const [recentMeetings, setRecentMeetings] = useState<DepartmentMeeting[]>([]);

  useEffect(() => {
    loadRecentMeetings();
  }, [department.id]);

  const loadRecentMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', department.id)
        .order('meeting_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentMeetings(data || []);
    } catch (error) {
      console.error('Failed to load recent meetings:', error);
    }
  };

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

      const { data, error } = await supabase
        .from('department_meetings')
        .insert([newMeeting])
        .select()
        .single();

      if (error) throw error;

      setFormData({
        meeting_date: '',
        meeting_time: '',
        location: department.location || '',
        topic: '',
        notes: ''
      });

      await loadRecentMeetings();
      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create department meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Schedule Department Meeting</h3>
        <p className="text-gray-600">Create a new meeting schedule for {department.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Creating Meeting...' : 'Schedule Department Meeting'}
          </button>
        </form>
      </div>

      {recentMeetings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Department Meetings</h4>
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                  </div>
                  <div className="text-sm text-gray-600">
                    {meeting.topic || 'No topic specified'} • {meeting.location}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  meeting.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : meeting.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {meeting.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Meeting Attendance Component
const MeetingAttendance = ({ 
  meeting, 
  department, 
  members, 
  onAttendanceSaved, 
  onError 
}: {
  meeting: DepartmentMeeting;
  department: Department;
  members: Member[];
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<DepartmentAttendanceRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAttendanceRecords();
  }, [meeting.id]);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
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
      setAttendanceRecords(data || []);
    } catch (error: any) {
      onError('Failed to load attendance records: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = async (memberId: string, status: 'present' | 'absent' | 'absent_with_reason', reason?: string) => {
    try {
      const existingRecord = attendanceRecords.find(record => record.member_id === memberId);
      
      if (existingRecord) {
        const { error } = await supabase
          .from('department_attendance')
          .update({ 
            status, 
            reason: status === 'absent_with_reason' ? reason : null 
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('department_attendance')
          .insert([{
            meeting_id: meeting.id,
            member_id: memberId,
            status,
            reason: status === 'absent_with_reason' ? reason : null
          }]);

        if (error) throw error;
      }

      await loadAttendanceRecords();
    } catch (error: any) {
      onError('Failed to update attendance: ' + error.message);
    }
  };

  const completeMeeting = async () => {
    try {
      setSaving(true);
      
      const membersWithAttendance = new Set(attendanceRecords.map(record => record.member_id));
      const allMembersHaveAttendance = members.every(member => membersWithAttendance.has(member.id));
      
      if (!allMembersHaveAttendance) {
        onError('Cannot complete meeting: Attendance must be recorded for all members');
        return;
      }

      const { error } = await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', meeting.id);

      if (error) throw error;

      onAttendanceSaved();
    } catch (error: any) {
      onError('Failed to complete meeting: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getMemberAttendanceStatus = (memberId: string) => {
    const record = attendanceRecords.find(r => r.member_id === memberId);
    return record?.status || null;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Take Attendance</h3>
        <p className="text-gray-600">
          Record attendance for {department.name} meeting on {new Date(meeting.meeting_date).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="font-semibold text-gray-900">Meeting Details</h4>
            <p className="text-gray-600">
              Date: {new Date(meeting.meeting_date).toLocaleDateString()}
              {meeting.meeting_time && ` at ${meeting.meeting_time}`}
            </p>
            <p className="text-gray-600">Location: {meeting.location}</p>
            {meeting.topic && <p className="text-gray-600">Topic: {meeting.topic}</p>}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Attendance Summary</h4>
            <p className="text-gray-600">
              Present: {attendanceRecords.filter(r => r.status === 'present').length}
            </p>
            <p className="text-gray-600">
              Absent: {attendanceRecords.filter(r => r.status === 'absent').length}
            </p>
            <p className="text-gray-600">
              Absent with Reason: {attendanceRecords.filter(r => r.status === 'absent_with_reason').length}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Department Members</h4>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No members found in this department
            </div>
          ) : (
            members.map((member) => {
              const status = getMemberAttendanceStatus(member.id);
              const [showReasonInput, setShowReasonInput] = useState(false);
              const [reason, setReason] = useState('');

              const handleStatusChange = async (newStatus: 'present' | 'absent' | 'absent_with_reason') => {
                if (newStatus === 'absent_with_reason') {
                  if (!reason.trim()) {
                    onError('Please provide a reason for absence');
                    return;
                  }
                  await handleAttendanceChange(member.id, newStatus, reason);
                  setShowReasonInput(false);
                  setReason('');
                } else {
                  await handleAttendanceChange(member.id, newStatus);
                  setShowReasonInput(false);
                }
              };

              return (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.name} {member.surname}
                      </div>
                      {member.email && (
                        <div className="text-sm text-gray-600">{member.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange('present')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        status === 'present'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <CheckSquare className="h-4 w-4" />
                      Present
                    </button>

                    <button
                      onClick={() => handleStatusChange('absent')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        status === 'absent'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Square className="h-4 w-4" />
                      Absent
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => {
                          if (status === 'absent_with_reason') {
                            setShowReasonInput(false);
                            handleStatusChange('absent');
                          } else {
                            setShowReasonInput(!showReasonInput);
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          status === 'absent_with_reason'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        Excused
                      </button>

                      {showReasonInput && (
                        <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                          <input
                            type="text"
                            placeholder="Enter reason for absence..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange('absent_with_reason')}
                              className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setShowReasonInput(false);
                                setReason('');
                              }}
                              className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={completeMeeting}
            disabled={saving || attendanceRecords.length !== members.length}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            {saving ? 'Completing Meeting...' : `Complete Meeting (${attendanceRecords.length}/${members.length} recorded)`}
          </button>
          {attendanceRecords.length !== members.length && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Please record attendance for all members before completing the meeting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Cancel Meeting Component
const CancelMeetingModal = ({ 
  meeting, 
  onCancel, 
  onClose 
}: {
  meeting: DepartmentMeeting;
  onCancel: (reason: string) => void;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      await onCancel(reason);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Ban className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cancel Meeting</h3>
            <p className="text-gray-600">
              {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Cancellation *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Please provide the reason for cancelling this meeting..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling || !reason.trim()}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Department Management Workflow Component
interface DepartmentWorkflowProps {
  department: Department;
  meetings: DepartmentMeeting[];
  members: Member[];
  allMembers: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onMembersUpdated: () => void;
}

const DepartmentManagementWorkflow: React.FC<DepartmentWorkflowProps> = ({
  department,
  meetings,
  members,
  allMembers,
  onClose,
  onSuccess,
  onError,
  onMembersUpdated
}) => {
  const { profile, canCreateDepartmentMeetings, canManageDepartmentAttendance, canCreateDepartmentReports, canManageDepartment } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);

  const steps = [
    { number: 1, title: 'Manage Members', description: 'Add or remove department members' },
    { number: 2, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 3, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;
    
    switch (stepNumber) {
      case 1:
        return canManageDepartment(department.id);
      case 2:
        return canCreateDepartmentMeetings(department.id);
      case 3:
        return canManageDepartmentAttendance(department.id);
      case 4:
        return canCreateDepartmentReports(department.id);
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
        {steps.map((step) => (
          <div key={step.number} className="text-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
              currentStep >= step.number 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {step.number}
            </div>
            <div className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 hidden sm:block">
              {step.description}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 min-h-[400px]">
        {currentStep === 1 && (
          <DepartmentMemberManagement
            department={department}
            currentMembers={members}
            allMembers={allMembers}
            onMembersUpdated={() => {
              onMembersUpdated();
              onSuccess('Department members updated successfully!');
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <DepartmentMeetingCreationStep 
            department={department}
            onMeetingCreated={() => {
              onSuccess('Department meeting created successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
          />
        )}

        {currentStep === 3 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Take Attendance</h3>
              <p className="text-gray-600">Select a meeting to record attendance</p>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No meetings scheduled for this department</p>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schedule a Meeting
                </button>
              </div>
            ) : selectedMeeting ? (
              <MeetingAttendance
                meeting={selectedMeeting}
                department={department}
                members={members}
                onAttendanceSaved={() => {
                  onSuccess('Attendance recorded successfully!');
                  setSelectedMeeting(null);
                  setCurrentStep(4);
                }}
                onError={onError}
              />
            ) : (
              <div className="grid gap-4 max-w-2xl mx-auto">
                {meetings
                  .filter(meeting => meeting.status === 'scheduled')
                  .map((meeting) => (
                    <div key={meeting.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                          </div>
                          <div className="text-sm text-gray-600">
                            {meeting.topic || 'No topic specified'} • {meeting.location}
                          </div>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {meeting.status}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedMeeting(meeting)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        Take Attendance
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Report Step</h3>
            <p className="text-gray-600">Report generation would go here</p>
            <button
              onClick={() => {
                onSuccess('Report created successfully!');
                onClose();
              }}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Report
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
        <button 
          onClick={() => {
            if (selectedMeeting) {
              setSelectedMeeting(null);
            } else {
              setCurrentStep(prev => prev - 1);
            }
          }}
          disabled={currentStep === 1 && !selectedMeeting}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
        >
          {selectedMeeting ? 'Back to Meetings' : 'Previous'}
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
          >
            Close
          </button>
          
          <button 
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={currentStep === 4 || !canAccessStep(currentStep + 1) || selectedMeeting !== null}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Meetings Modal Component
const EnhancedMeetingsModal = ({ 
  department, 
  meetings, 
  members, 
  onClose, 
  onSuccess, 
  onError 
}: {
  department: Department;
  meetings: DepartmentMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) => {
  const { canManageDepartmentAttendance, canCancelDepartmentMeetings } = useAuth();
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [meetingToCancel, setMeetingToCancel] = useState<DepartmentMeeting | null>(null);

  const canManageAttendance = canManageDepartmentAttendance(department.id);
  const canCancelMeetings = canCancelDepartmentMeetings(department.id);

  const handleCancelMeeting = async (reason: string) => {
    if (!meetingToCancel) return;

    try {
      const { error } = await supabase
        .from('department_meetings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason 
        })
        .eq('id', meetingToCancel.id);

      if (error) throw error;

      onSuccess('Meeting cancelled successfully!');
      setShowCancelModal(false);
      setMeetingToCancel(null);
    } catch (error: any) {
      onError('Failed to cancel meeting: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {department.name} - Meetings
            {selectedMeeting && ` - Attendance`}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {selectedMeeting ? (
          <MeetingAttendance
            meeting={selectedMeeting}
            department={department}
            members={members}
            onAttendanceSaved={() => {
              onSuccess('Attendance recorded successfully!');
              setSelectedMeeting(null);
            }}
            onError={onError}
          />
        ) : (
          <div className="space-y-4">
            {meetings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No meetings scheduled</p>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {new Date(meeting.meeting_date).toLocaleDateString()}
                        {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                      </div>
                      {meeting.topic && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Topic: {meeting.topic}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Location: {meeting.location}
                      </div>
                      {meeting.status === 'cancelled' && meeting.cancellation_reason && (
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Cancellation Reason: {meeting.cancellation_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : meeting.status === 'cancelled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {meeting.status}
                      </span>
                      
                      {canManageAttendance && meeting.status === 'scheduled' && (
                        <button
                          onClick={() => setSelectedMeeting(meeting)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Users className="h-3 w-3" />
                          Take Attendance
                        </button>
                      )}
                      
                      {canCancelMeetings && meeting.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            setMeetingToCancel(meeting);
                            setShowCancelModal(true);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Ban className="h-3 w-3" />
                          Cancel
                        </button>
                      )}
                      
                      {meeting.status === 'completed' && (
                        <button
                          onClick={() => {
                            onSuccess('Report view would open here');
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Printer className="h-3 w-3" />
                          View Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showCancelModal && meetingToCancel && (
          <CancelMeetingModal
            meeting={meetingToCancel}
            onCancel={handleCancelMeeting}
            onClose={() => {
              setShowCancelModal(false);
              setMeetingToCancel(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Main Departments Component
const Departments = () => {
  const { profile, canViewDepartment, canManageDepartment, isAdmin, isPastor, isDepartmentLeader, isGroupLeader, isDeacon, getRoles } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);

  useEffect(() => {
    loadDepartments();
    loadAllMembers();
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
          const { count, error: countError } = await supabase
            .from('department_members')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', department.id);

          return {
            ...department,
            memberCount: count || 0
          };
        })
      );

      setDepartments(departmentsWithMemberCounts);
    } catch (error: any) {
      setError('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAllMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  };

  const loadDepartmentMembers = async (departmentId: string) => {
    try {
      const { data: departmentMembersData, error: deptMembersError } = await supabase
        .from('department_members')
        .select('member_id')
        .eq('department_id', departmentId);

      if (deptMembersError) throw deptMembersError;

      const memberIds = (departmentMembersData || []).map(dm => dm.member_id);

      if (memberIds.length === 0) {
        setDepartmentMembers([]);
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .in('id', memberIds);

      if (membersError) throw membersError;

      setDepartmentMembers(membersData || []);
    } catch (error: any) {
      setError('Failed to load department members: ' + error.message);
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
    if (!canViewDepartment(department.id)) {
      setError('You do not have permission to view this department');
      return;
    }

    setSelectedDepartment(department);
    setShowMeetingsModal(true);
    await loadMeetings(department.id);
    await loadDepartmentMembers(department.id);
  };

  const openWorkflowModal = async (department: Department) => {
    if (!canManageDepartment(department.id)) {
      setError('You do not have permission to manage this department');
      return;
    }

    setSelectedDepartment(department);
    setShowWorkflowModal(true);
    await loadMeetings(department.id);
    await loadDepartmentMembers(department.id);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setSelectedDepartment(null);
    setDepartmentMembers([]);
  };

  const filteredDepartments = departments.filter(department =>
    canViewDepartment(department.id) && (
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const roles = getRoles();
    if (roles.includes('admin') || roles.includes('administrator')) return 'Administrator';
    if (roles.includes('pastor')) return 'Pastor';
    if (roles.includes('deacon')) return 'Deacon';
    if (roles.includes('department_leader')) return 'Department Leader';
    if (roles.includes('group_leader')) return 'Group Leader';
    return 'Member';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Departments
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view departments'}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

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

        {!profile ? (
          <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Please Log In
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              You need to be logged in to view
