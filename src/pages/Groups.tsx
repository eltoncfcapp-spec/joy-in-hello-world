import { Users, Plus, Calendar, User, Search, X, Mail, Phone, Clock, CheckCircle, XCircle, Clock4, FileText, Edit2, Trash2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Group {
  id: string;
  name: string;
  description?: string | null;
  meeting_day: string | null;
  meeting_time?: string;
  category?: string;
  location: string | null;
  leader_id: string | null;
  leader?: {
    name: string;
    surname: string;
  } | null;
  members?: Member[];
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
}

interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  topic: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'late';
  arrival_time: string;
  notes: string;
  member?: Member;
}

interface MeetingReport {
  id: string;
  meeting_id: string;
  report_text: string;
  decisions_made: string;
  action_items: string;
  next_meeting_date: string;
  created_by: string;
}

const Groups = () => {
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members'>('groups');
  
  // Meeting states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Form states
  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [reportForm, setReportForm] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const [attendanceData, setAttendanceData] = useState<{[key: string]: 'present' | 'absent' | 'late'}>({});
  const [attendanceNotes, setAttendanceNotes] = useState<{[key: string]: string}>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchGroups();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMeetings(selectedGroup.id);
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(name, surname)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data as Group[] || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', groupId)
        .order('name');

      if (error) throw error;
      
      setGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, members: data || [] } : group
      ));
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const fetchGroupMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchMeetingAttendance = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          member:members(*)
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // Add members to group
  const handleAddMembersToGroup = async (groupId: string, memberIds: string[]) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: groupId })
        .in('id', memberIds);

      if (error) throw error;

      await fetchGroupMembers(groupId);
      await fetchMembers();
      setSelectedMembers([]);
      alert('Members added to group successfully!');
    } catch (error) {
      console.error('Error adding members to group:', error);
      alert('Error adding members to group');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from group
  const handleRemoveMemberFromGroup = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
        await fetchMembers();
      }
      alert('Member removed from group successfully!');
    } catch (error) {
      console.error('Error removing member from group:', error);
      alert('Error removing member from group');
    }
  };

  // Meeting management
  const handleCreateMeeting = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          group_id: selectedGroup.id,
          meeting_date: meetingForm.meeting_date,
          meeting_time: meetingForm.meeting_time,
          location: meetingForm.location,
          topic: meetingForm.topic,
          notes: meetingForm.notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      setMeetings(prev => [data, ...prev]);
      setShowMeetingForm(false);
      setMeetingForm({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
      alert('Meeting scheduled successfully!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Error creating meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    await fetchMeetingAttendance(meeting.id);
    
    // Initialize attendance data
    const groupMembers = groups.find(g => g.id === meeting.group_id)?.members || [];
    const initialAttendance: {[key: string]: 'present' | 'absent' | 'late'} = {};
    const initialNotes: {[key: string]: string} = {};

    groupMembers.forEach(member => {
      const existing = attendance.find(a => a.member_id === member.id);
      initialAttendance[member.id] = existing?.status || 'absent';
      initialNotes[member.id] = existing?.notes || '';
    });

    setAttendanceData(initialAttendance);
    setAttendanceNotes(initialNotes);
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;

    try {
      setLoading(true);
      
      // Delete existing attendance records
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      // Create new attendance records
      const attendanceRecords = Object.entries(attendanceData).map(([memberId, status]) => ({
        meeting_id: selectedMeeting.id,
        member_id: memberId,
        status: status,
        notes: attendanceNotes[memberId] || '',
        arrival_time: status === 'late' ? new Date().toTimeString().split(' ')[0] : null
      }));

      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      setShowAttendanceModal(false);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting) return;

    try {
      setLoading(true);
      
      // Update meeting status to completed
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      // Refresh meetings list
      await fetchGroupMeetings(selectedMeeting.group_id);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error closing meeting:', error);
      alert('Error closing meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedMeeting) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: selectedMeeting.id,
          report_text: reportForm.report_text,
          decisions_made: reportForm.decisions_made,
          action_items: reportForm.action_items,
          next_meeting_date: reportForm.next_meeting_date || null
        });

      if (error) throw error;

      setShowReportModal(false);
      setReportForm({
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      alert('Meeting report submitted successfully!');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getAttendanceStats = (meetingId: string) => {
    const meetingAttendance = attendance.filter(a => a.meeting_id === meetingId);
    const present = meetingAttendance.filter(a => a.status === 'present').length;
    const absent = meetingAttendance.filter(a => a.status === 'absent').length;
    const late = meetingAttendance.filter(a => a.status === 'late').length;
    
    return { present, absent, late, total: meetingAttendance.length };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Groups & Ministries
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage church groups, meetings, and member assignments</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showForm ? 'Cancel' : 'Create Group'}
          </button>
        </div>

        {/* Group Selection and Tabs */}
        {selectedGroup && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Leader: {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : 'Not assigned'}
                  {selectedGroup.meeting_day && ` • Meets on ${selectedGroup.meeting_day}s`}
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Groups
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['groups', 'meetings', 'members'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'groups' && 'Group Info'}
                  {tab === 'meetings' && 'Meetings'}
                  {tab === 'members' && 'Members'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group Details View */}
        {selectedGroup && activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Group Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Group Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.meeting_day || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.location || 'Not set'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowMeetingForm(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Meeting
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Users className="h-4 w-4" />
                    Manage Members
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Meetings</h3>
              {meetings.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">No meetings scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {meetings.slice(0, 5).map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {meeting.topic} • {meeting.location}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTakeAttendance(meeting)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Take Attendance
                        </button>
                        {meeting.status === 'scheduled' && (
                          <button
                            onClick={() => handleCloseMeeting()}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Close Meeting
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meetings Tab */}
        {selectedGroup && activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings</h3>
              <button
                onClick={() => setShowMeetingForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </button>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No meetings scheduled yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {meetings.map((meeting) => {
                  const stats = getAttendanceStats(meeting.id);
                  return (
                    <div key={meeting.id} className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {new Date(meeting.meeting_date).toLocaleDateString()} • {meeting.meeting_time}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{meeting.topic}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">Location: {meeting.location}</p>
                          
                          {stats.total > 0 && (
                            <div className="flex gap-4 mt-3 text-sm">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                {stats.present} Present
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                {stats.absent} Absent
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock4 className="h-4 w-4" />
                                {stats.late} Late
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleTakeAttendance(meeting)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Take Attendance
                          </button>
                          {meeting.status === 'scheduled' && (
                            <button
                              onClick={() => {
                                setSelectedMeeting(meeting);
                                handleCloseMeeting();
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              Close Meeting
                            </button>
                          )}
                          {meeting.status === 'completed' && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm text-center">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Members Management Tab */}
        {selectedGroup && activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Group Members ({selectedGroup.members?.length || 0})
              </h3>
            </div>

            {/* Add Members Section */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Members to Group</h4>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search members to add..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Available Members */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-xl max-h-60 overflow-y-auto">
                  {members
                    .filter(member => 
                      !selectedGroup.members?.some(m => m.id === member.id) &&
                      (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => {
                            if (selectedMembers.includes(member.id)) {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                            } else {
                              setSelectedMembers([...selectedMembers, member.id]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email} • {member.phone}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {selectedMembers.length > 0 && (
                  <button
                    onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Adding Members...' : `Add ${selectedMembers.length} Members to Group`}
                  </button>
                )}
              </div>
            </div>

            {/* Current Members */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Members</h4>
              
              {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">No members in this group yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {member.phone}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMemberFromGroup(member.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Groups List (when no group is selected) */}
        {!selectedGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Groups Yet</h3>
                <p className="text-gray-500 dark:text-gray-500">Create your first group to get started</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                      {group.location && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          {group.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    {group.meeting_day && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Meets on {group.meeting_day}s</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.members?.length || 0} members
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium">
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Meeting Form Modal */}
        {showMeetingForm && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Schedule New Meeting</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateMeeting(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Date *</label>
                    <input
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time *</label>
                    <input
                      type="time"
                      value={meetingForm.meeting_time}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location *</label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter meeting location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic/Agenda</label>
                  <input
                    type="text"
                    value={meetingForm.topic}
                    onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter meeting topic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMeetingForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && selectedMeeting && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Take Attendance - {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              </h3>
              
              <div className="space-y-4">
                {selectedGroup.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(member.name, member.surname)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.phone}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <select
                        value={attendanceData[member.id] || 'absent'}
                        onChange={(e) => setAttendanceData({
                          ...attendanceData,
                          [member.id]: e.target.value as 'present' | 'absent' | 'late'
                        })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                      
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={attendanceNotes[member.id] || ''}
                        onChange={(e) => setAttendanceNotes({
                          ...attendanceNotes,
                          [member.id]: e.target.value
                        })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-48"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {loading ? 'Saving...' : 'Save Attendance'}
                </button>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Meeting Report</h3>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitReport(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Report *</label>
                  <textarea
                    value={reportForm.report_text}
                    onChange={(e) => setReportForm({ ...reportForm, report_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="What was discussed and accomplished..."
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions Made</label>
                  <textarea
                    value={reportForm.decisions_made}
                    onChange={(e) => setReportForm({ ...reportForm, decisions_made: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Key decisions made during the meeting..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Items</label>
                  <textarea
                    value={reportForm.action_items}
                    onChange={(e) => setReportForm({ ...reportForm, action_items: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tasks and responsibilities assigned..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Meeting Date</label>
                  <input
                    type="date"
                    value={reportForm.next_meeting_date}
                    onChange={(e) => setReportForm({ ...reportForm, next_meeting_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
