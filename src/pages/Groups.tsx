import { Users, Plus, Calendar, User, Search, X, CheckCircle, XCircle, Clock4, Trash2, FileText, Save, Eye, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext'; // Import your auth context

// Type-safe wrapper for groups-related queries
const db = supabase as any;

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
  meeting_id: string | null;
  report_text: string;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_by: string | null;
  created_at: string;
  meeting?: Meeting;
  author?: {
    name: string;
    surname: string;
  };
}

const Groups = () => {
  const { profile } = useAuth(); // Get user profile from auth context
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members' | 'reports'>('groups');
  
  // Meeting states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    meeting_day: '',
    meeting_time: '',
    location: '',
    leader_id: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [reportForm, setReportForm] = useState({
    meeting_id: '',
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
      fetchMeetingReports(selectedGroup.id);
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
      const { data, error } = await db
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
      const { data, error } = await db
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
      const { data, error } = await db
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

  const fetchMeetingReports = async (groupId: string) => {
    try {
      const { data, error } = await db
        .from('meeting_reports')
        .select(`
          *,
          meeting:meetings(*),
          author:members(name, surname)
        `)
        .eq('meeting.group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetingReports(data || []);
    } catch (error) {
      console.error('Error fetching meeting reports:', error);
    }
  };

  // FIXED: Create new group function
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (!groupForm.name.trim()) {
        alert('Group name is required');
        return;
      }

      const groupData = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        location: groupForm.location.trim() || null,
        leader_id: groupForm.leader_id || null
      };

      console.log('Creating group with data:', groupData);

      const { data, error } = await db
        .from('cell_groups')
        .insert([groupData])
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(name, surname)
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setGroups(prev => [data, ...prev]);
      setShowForm(false);
      setGroupForm({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: '',
        location: '',
        leader_id: ''
      });
      
      alert('Group created successfully!');
    } catch (error: any) {
      console.error('Error creating group:', error);
      alert(`Error creating group: ${error.message || 'Please check your data and try again'}`);
    } finally {
      setLoading(false);
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
      setSearchTerm('');
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
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      setLoading(true);
      
      if (!meetingForm.meeting_date || !meetingForm.meeting_time || !meetingForm.location) {
        alert('Please fill in all required fields');
        return;
      }

      const { data, error } = await db
        .from('meetings')
        .insert([{
          group_id: selectedGroup.id,
          meeting_date: meetingForm.meeting_date,
          meeting_time: meetingForm.meeting_time,
          location: meetingForm.location,
          topic: meetingForm.topic,
          notes: meetingForm.notes,
          status: 'scheduled'
        }])
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
    const currentGroup = groups.find(g => g.id === meeting.group_id);
    const groupMembers = currentGroup?.members || [];
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
      
      // Get current group members
      const currentGroup = groups.find(g => g.id === selectedMeeting.group_id);
      const groupMembers = currentGroup?.members || [];

      // Prepare attendance records
      const attendanceRecords = groupMembers.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendanceData[member.id] || 'absent',
        notes: attendanceNotes[member.id] || '',
        arrival_time: attendanceData[member.id] === 'late' ? new Date().toTimeString().split(' ')[0] : null
      }));

      // Delete existing attendance records for this meeting
      const { error: deleteError } = await db
        .from('attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      // Insert new attendance records
      const { error: insertError } = await db
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
      const { error } = await db
        .from('meetings')
        .update({ status: 'completed' as any })
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

  // FIXED: Meeting Report Functions
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !profile) {
      alert('Meeting not selected or user not authenticated');
      return;
    }

    if (!reportForm.report_text.trim()) {
      alert('Report text is required');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Submitting report with data:', {
        meeting_id: selectedMeeting.id,
        report_text: reportForm.report_text,
        decisions_made: reportForm.decisions_made || null,
        action_items: reportForm.action_items || null,
        next_meeting_date: reportForm.next_meeting_date || null,
        created_by: profile.id
      });

      const { data, error } = await db
        .from('meeting_reports')
        .insert([{
          meeting_id: selectedMeeting.id,
          report_text: reportForm.report_text,
          decisions_made: reportForm.decisions_made || null,
          action_items: reportForm.action_items || null,
          next_meeting_date: reportForm.next_meeting_date || null,
          created_by: profile.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Report created successfully:', data);

      // Refresh reports list
      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }

      setShowReportModal(false);
      setReportForm({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      alert('Meeting report submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert(`Error submitting report: ${error.message || 'Please check your data and try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGeneralReport = async () => {
    if (!selectedGroup || !profile) {
      alert('Group not selected or user not authenticated');
      return;
    }

    if (!reportForm.report_text.trim()) {
      alert('Report text is required');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Creating general report with data:', {
        meeting_id: null,
        report_text: reportForm.report_text,
        decisions_made: reportForm.decisions_made || null,
        action_items: reportForm.action_items || null,
        next_meeting_date: reportForm.next_meeting_date || null,
        created_by: profile.id
      });

      const { data, error } = await db
        .from('meeting_reports')
        .insert([{
          meeting_id: null,
          report_text: reportForm.report_text,
          decisions_made: reportForm.decisions_made || null,
          action_items: reportForm.action_items || null,
          next_meeting_date: reportForm.next_meeting_date || null,
          created_by: profile.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('General report created successfully:', data);

      // Refresh reports list
      await fetchMeetingReports(selectedGroup.id);

      setShowReportModal(false);
      setReportForm({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      alert('General report created successfully!');
    } catch (error: any) {
      console.error('Error creating general report:', error);
      alert(`Error creating report: ${error.message || 'Please check your data and try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await db
        .from('meeting_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }
      
      alert('Meeting report deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting meeting report:', error);
      alert(`Error deleting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openReportForm = (meeting?: Meeting) => {
    setSelectedMeeting(meeting || null);
    setReportForm({
      meeting_id: meeting?.id || '',
      report_text: '',
      decisions_made: '',
      action_items: '',
      next_meeting_date: ''
    });
    setShowReportModal(true);
  };

  const openReportView = (report: MeetingReport) => {
    setSelectedReport(report);
    setShowReportView(true);
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

  // Filter available members for adding to group
  const availableMembers = members.filter(member => 
    !selectedGroup?.members?.some(m => m.id === member.id) &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

        {/* Create Group Form */}
        {showForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={groupForm.location}
                    onChange={(e) => setGroupForm({ ...groupForm, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Meeting location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Day</label>
                  <select
                    value={groupForm.meeting_day}
                    onChange={(e) => setGroupForm({ ...groupForm, meeting_day: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select day</option>
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
                  <input
                    type="time"
                    value={groupForm.meeting_time}
                    onChange={(e) => setGroupForm({ ...groupForm, meeting_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Group description and purpose"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader (Optional)</label>
                  <select
                    value={groupForm.leader_id}
                    onChange={(e) => setGroupForm({ ...groupForm, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select leader</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Group Selection and Tabs */}
        {selectedGroup && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Leader: {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : 'Not assigned'}
                  {selectedGroup.meeting_day && ` • Meets on ${selectedGroup.meeting_day}s`}
                  {selectedGroup.location && ` • ${selectedGroup.location}`}
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
              {(['groups', 'meetings', 'members', 'reports'] as const).map((tab) => (
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
                  {tab === 'reports' && 'Reports'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {selectedGroup && activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Reports</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => openReportForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  General Report
                </button>
              </div>
            </div>

            {meetingReports.length === 0 ? (
              <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No meeting reports yet</p>
                <button
                  onClick={() => openReportForm()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create First Report
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {meetingReports.map((report) => (
                  <div key={report.id} className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {report.meeting ? 
                              `Meeting: ${new Date(report.meeting.meeting_date).toLocaleDateString()}` : 
                              'General Report'
                            }
                          </h4>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Created: {new Date(report.created_at).toLocaleDateString()}
                          {report.author && ` by ${report.author.name} ${report.author.surname}`}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {report.report_text}
                        </p>
                        {report.next_meeting_date && (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mt-2">
                            <Calendar className="h-3 w-3" />
                            Next: {new Date(report.next_meeting_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openReportView(report)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="View report"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.description || 'No description'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.meeting_day || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Time</label>
                    <p className="text-gray-900 dark:text-white">{selectedGroup.meeting_time || 'Not set'}</p>
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
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Calendar className="h-4 w-4" />
                    View Meetings
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    View Reports
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Meetings</h3>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No meetings scheduled yet</p>
                  <button
                    onClick={() => setShowMeetingForm(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Schedule First Meeting
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.slice(0, 3).map((meeting) => {
                    const stats = getAttendanceStats(meeting.id);
                    return (
                      <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {meeting.topic} • {meeting.location}
                          </div>
                          {stats.total > 0 && (
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {stats.present} Present
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                {stats.absent} Absent
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock4 className="h-3 w-3" />
                                {stats.late} Late
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTakeAttendance(meeting)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Attendance
                          </button>
                          {meeting.status === 'scheduled' && (
                            <button
                              onClick={() => {
                                setSelectedMeeting(meeting);
                                handleCloseMeeting();
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Close
                            </button>
                          )}
                          {meeting.status === 'completed' && (
                            <button
                              onClick={() => openReportForm(meeting)}
                              className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                            >
                              Add Report
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                <p className="text-gray-600 dark:text-gray-400 mb-4">No meetings scheduled yet</p>
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schedule First Meeting
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {meetings.map((meeting) => {
                  const stats = getAttendanceStats(meeting.id);
                  return (
                    <div key={meeting.id} className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {new Date(meeting.meeting_date).toLocaleDateString()} • {meeting.meeting_time}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              meeting.status === 'scheduled' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : meeting.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{meeting.topic || 'No topic specified'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">Location: {meeting.location}</p>
                          
                          {stats.total > 0 && (
                            <div className="flex gap-4 text-sm">
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
                            <button
                              onClick={() => openReportForm(meeting)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                            >
                              Add Report
                            </button>
                          )}
                        </div>
                      </div>
                      {meeting.notes && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{meeting.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Members Management Tab - Keep existing code */}
        {selectedGroup && activeTab === 'members' && (
          <div className="space-y-6">
            {/* ... existing members management code ... */}
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
                <p className="text-gray-500 dark:text-gray-500 mb-6">Create your first group to get started</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Create First Group
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                      {group.location && (
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-2">
                          {group.location}
                        </span>
                      )}
                      {group.meeting_day && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          Meets on {group.meeting_day}s
                          {group.meeting_time && ` at ${group.meeting_time}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.members?.length || 0} members
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm">
                      Manage Group
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Meeting Form Modal - Keep existing code */}
        {showMeetingForm && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* ... existing meeting form modal code ... */}
          </div>
        )}

        {/* Attendance Modal - Keep existing code */}
        {showAttendanceModal && selectedMeeting && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* ... existing attendance modal code ... */}
          </div>
        )}

        {/* Report Modal - FIXED */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedMeeting ? 'Meeting Report' : 'General Group Report'}
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={selectedMeeting ? handleSubmitReport : (e) => { e.preventDefault(); handleCreateGeneralReport(); }} className="space-y-4">
                {selectedMeeting && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Reporting for meeting on {new Date(selectedMeeting.meeting_date).toLocaleDateString()} at {selectedMeeting.meeting_time}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Text *</label>
                  <textarea
                    value={reportForm.report_text}
                    onChange={(e) => setReportForm({ ...reportForm, report_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Key decisions made..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Items</label>
                  <textarea
                    value={reportForm.action_items}
                    onChange={(e) => setReportForm({ ...reportForm, action_items: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* View Report Modal */}
        {showReportView && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Report</h3>
                <button
                  onClick={() => setShowReportView(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-900 dark:text-white">
                        {selectedReport.meeting ? 
                          `${new Date(selectedReport.meeting.meeting_date).toLocaleDateString()}` : 
                          'General Report'
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Date</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedReport.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedReport.next_meeting_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Meeting</label>
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-300">
                        {new Date(selectedReport.next_meeting_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Content</label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg whitespace-pre-wrap">
                    {selectedReport.report_text}
                  </div>
                </div>

                {selectedReport.decisions_made && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions Made</label>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg whitespace-pre-wrap">
                      {selectedReport.decisions_made}
                    </div>
                  </div>
                )}

                {selectedReport.action_items && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Items</label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg whitespace-pre-wrap">
                      {selectedReport.action_items}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowReportView(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
