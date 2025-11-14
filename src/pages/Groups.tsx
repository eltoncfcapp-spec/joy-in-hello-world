import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, FileText, Save, Eye, Clock, CheckCircle, XCircle, UserPlus, Mail, Phone, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
// Types
interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  leader?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  } | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  members_count?: number;
}

interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  cancellation_reason?: string | null;
  created_at: string;
  has_attendance?: boolean;
  has_report?: boolean;
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

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role?: string | null;
  permissions?: string[] | null;
  assigned_groups?: string[] | null;
  assigned_departments?: string[] | null;
  cell_group_id?: string | null;
  is_leader?: boolean;
}

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason?: string | null;
  created_at: string;
  member?: Member;
}

interface AuthProfile {
  id: string;
  name: string;
  surname: string;
  role: string;
  assigned_groups: string[];
  cell_group_id?: string | null;
}

interface AuthContext {
  profile: AuthProfile | null;
  hasPermission: (permission: string) => boolean;
  canViewGroup: (groupId: string) => boolean;
  canManageGroup: (groupId: string) => boolean;
  getUserGroups: () => string[];
}

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showManageLeadersModal, setShowManageLeadersModal] = useState(false);
  const [showCancelMeetingModal, setShowCancelMeetingModal] = useState(false);
  const [showCompleteMeetingModal, setShowCompleteMeetingModal] = useState(false);
  
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [allGroups, setAllGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [potentialLeaders, setPotentialLeaders] = useState<Member[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
  });
  const [meetingFormData, setMeetingFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [reportFormData, setReportFormData] = useState({
    meeting_id: '',
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const [attendanceFormData, setAttendanceFormData] = useState<{
    [key: string]: 'present' | 'absent' | 'absent_with_reason';
  }>({});

  const [absenceReasons, setAbsenceReasons] = useState<{[key: string]: string}>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Data fetching functions
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cell_groups')
        .select(`
          *,
          leader:profiles!cell_groups_leader_id_fkey(
            id,
            name,
            surname,
            email,
            phone
          )
        `)
        .order('name');

      // Apply filters based on user permissions
      if (!canViewAllGroups() && profile) {
        const userGroups = getUserGroups();
        if (userGroups.length > 0) {
          query = query.in('id', userGroups);
        } else {
          setGroups([]);
          setAllGroups([]);
          setHasAccess(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setGroups(data || []);
      setAllGroups(data || []);
      setHasAccess(true);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      setError(`Error loading groups: ${error.message}`);
      setHasAccess(false);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchMembers = async (groupId?: string) => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (groupId) {
        query = query.eq('cell_group_id', groupId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(`Error loading members: ${error.message}`);
    }
  };

  const fetchMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      setMeetings(data || []);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      setError(`Error loading meetings: ${error.message}`);
    }
  };

  const fetchMeetingReports = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select(`
          *,
          meeting:meetings(*),
          author:profiles!meeting_reports_created_by_fkey(
            name,
            surname
          )
        `)
        .eq('meeting.group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMeetingReports(data || []);
    } catch (error: any) {
      console.error('Error fetching meeting reports:', error);
      setError(`Error loading meeting reports: ${error.message}`);
    }
  };

  const fetchAttendance = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          member:profiles(*)
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;

      setAttendance(data || []);

      // Initialize attendance form data
      const initialAttendance: { [key: string]: 'present' | 'absent' | 'absent_with_reason' } = {};
      const initialReasons: { [key: string]: string } = {};

      data?.forEach(record => {
        initialAttendance[record.member_id] = record.status;
        if (record.reason) {
          initialReasons[record.member_id] = record.reason;
        }
      });

      setAttendanceFormData(initialAttendance);
      setAbsenceReasons(initialReasons);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      setError(`Error loading attendance: ${error.message}`);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('cell_group_id', null)
        .order('name');

      if (error) throw error;

      setAvailableMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching available members:', error);
      setError(`Error loading available members: ${error.message}`);
    }
  };

  const fetchPotentialLeaders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or('role.eq.group_leader,role.eq.admin')
        .order('name');

      if (error) throw error;

      setPotentialLeaders(data || []);
    } catch (error: any) {
      console.error('Error fetching potential leaders:', error);
      setError(`Error loading potential leaders: ${error.message}`);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchGroups();
    fetchMembers();
    fetchPotentialLeaders();
  }, []);

  // Permission functions
  const canCreateGroups = () => {
    if (!profile) return false;
    return hasPermission('manage_all_groups') || profile.role === 'admin';
  };

  const canViewAllGroups = () => {
    if (!profile) return false;
    return hasPermission('view_all_groups') || profile.role === 'admin';
  };

  const canManageAllGroups = () => {
    if (!profile) return false;
    return hasPermission('manage_all_groups') || profile.role === 'admin';
  };

  const checkCanManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canManageGroup(group.id) || canManageAllGroups();
  };

  const checkCanViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canViewGroup(group.id) || canViewAllGroups();
  };

  // Group CRUD operations
  const createGroup = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('cell_groups')
        .insert([{
          name: formData.name,
          description: formData.description,
          location: formData.location,
          meeting_day: formData.meeting_day,
          meeting_time: formData.meeting_time,
          leader_id: formData.leader_id || null
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchGroups();
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        location: '',
        meeting_day: '',
        meeting_time: '',
        leader_id: '',
      });
      setSuccess('Group created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating group:', error);
      setError(`Error creating group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('cell_groups')
        .update({
          name: formData.name,
          description: formData.description,
          location: formData.location,
          meeting_day: formData.meeting_day,
          meeting_time: formData.meeting_time,
          leader_id: formData.leader_id || null
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchGroups();
      setShowEditForm(false);
      setSelectedGroup(null);
      setSuccess('Group updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating group:', error);
      setError(`Error updating group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to delete this group');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      await fetchGroups();
      setSuccess('Group deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      setError(`Error deleting group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Meeting operations
  const createMeeting = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .insert([{
          group_id: selectedGroup.id,
          meeting_date: meetingFormData.meeting_date,
          meeting_time: meetingFormData.meeting_time,
          location: meetingFormData.location || selectedGroup.location,
          topic: meetingFormData.topic,
          notes: meetingFormData.notes,
          status: 'scheduled'
        }]);

      if (error) throw error;

      await fetchMeetings(selectedGroup.id);
      setMeetingFormData({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
      setSuccess('Meeting scheduled successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(`Error creating meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Meeting Function
  const openCancelMeetingModal = (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to cancel meetings for this group');
      return;
    }

    setSelectedMeeting(meeting);
    setCancellationReason('');
    setShowCancelMeetingModal(true);
  };

  const cancelMeeting = async () => {
    if (!selectedMeeting || !cancellationReason.trim()) {
      setError('Cancellation reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetings(selectedGroup.id);
      }

      setSuccess('Meeting cancelled successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowCancelMeetingModal(false);
      setCancellationReason('');
    } catch (error: any) {
      console.error('Error cancelling meeting:', error);
      setError(`Error cancelling meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Complete Meeting Function
  const openCompleteMeetingModal = async (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to complete meetings for this group');
      return;
    }

    // Check if attendance has been recorded
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('meeting_id', meeting.id);

    const hasAttendance = attendanceData && attendanceData.length > 0;

    // Check if report has been created
    const { data: reportData } = await supabase
      .from('meeting_reports')
      .select('*')
      .eq('meeting_id', meeting.id);

    const hasReport = reportData && reportData.length > 0;

    // Get total members count
    const groupMembers = members.filter(m => m.cell_group_id === selectedGroup.id);
    const allMembersRecorded = hasAttendance && attendanceData.length === groupMembers.length;

    if (!allMembersRecorded) {
      setError('Cannot complete meeting: Attendance must be recorded for all members');
      return;
    }

    if (!hasReport) {
      setError('Cannot complete meeting: A meeting report must be created first');
      return;
    }

    setSelectedMeeting(meeting);
    setShowCompleteMeetingModal(true);
  };

  const completeMeeting = async () => {
    if (!selectedMeeting) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetings(selectedGroup.id);
      }

      setSuccess('Meeting marked as completed!');
      setTimeout(() => setSuccess(null), 3000);
      setShowCompleteMeetingModal(false);
    } catch (error: any) {
      console.error('Error completing meeting:', error);
      setError(`Error completing meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceModal = async (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage attendance for this group');
      return;
    }

    setSelectedMeeting(meeting);
    await fetchAttendance(meeting.id);
    setShowAttendanceModal(true);
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'absent_with_reason') => {
    setAttendanceFormData(prev => ({
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
    if (!selectedMeeting || !selectedGroup) return;

    const groupMembers = members.filter(member => member.cell_group_id === selectedGroup.id);
    
    // Check if all members have attendance assigned
    const allAssigned = groupMembers.every(member => attendanceFormData[member.id]);
    
    if (!allAssigned) {
      setError('Please assign attendance status for all members before saving');
      return;
    }

    // Check if reasons are provided for absent_with_reason
    const needsReason = groupMembers.filter(member => 
      attendanceFormData[member.id] === 'absent_with_reason'
    );
    
    const allReasonsProvided = needsReason.every(member => 
      absenceReasons[member.id] && absenceReasons[member.id].trim() !== ''
    );

    if (!allReasonsProvided) {
      setError('Please provide reasons for all absences marked as "Absent with Reason"');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const attendanceRecords = groupMembers.map(member => {
        const status = attendanceFormData[member.id];
        const reason = status === 'absent_with_reason' ? absenceReasons[member.id] || '' : null;

        return {
          meeting_id: selectedMeeting.id,
          member_id: member.id,
          status,
          reason
        };
      });

      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      setSuccess('Attendance saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowAttendanceModal(false);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(`Error saving attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openMeetingsModal = async (group: CellGroup) => {
    if (!checkCanViewGroup(group)) {
      setError('You do not have permission to view this cell group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
    await fetchMeetings(group.id);
    await fetchMeetingReports(group.id);
  };

  const openReportForm = (meeting?: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to create reports for this group');
      return;
    }

    setSelectedMeeting(meeting || null);
    setReportFormData({
      meeting_id: meeting?.id || '',
      report_text: '',
      decisions_made: '',
      action_items: '',
      next_meeting_date: ''
    });
    setShowReportForm(true);
  };

  const createMeetingReport = async () => {
    if (!profile || !reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null,
          created_by: profile.id
        });

      if (error) throw error;

      setShowReportForm(false);
      setSuccess('Meeting report created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }
    } catch (error: any) {
      console.error('Error creating meeting report:', error);
      setError(`Error creating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (report: MeetingReport) => {
    setSelectedReport(report);
    setShowReportView(true);
  };

  const openAddMembersModal = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to manage members for this group');
      return;
    }

    setSelectedGroup(group);
    await fetchAvailableMembers();
    setShowAddMembersModal(true);
  };

  const addMembersToGroup = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update({ cell_group_id: selectedGroup.id })
        .in('id', selectedMembers);

      if (error) throw error;

      await fetchMembers();
      await fetchAvailableMembers();
      setSelectedMembers([]);
      setShowAddMembersModal(false);
      setSuccess('Members added to group successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding members to group:', error);
      setError(`Error adding members to group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openManageLeadersModal = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to manage leaders for this group');
      return;
    }

    setSelectedGroup(group);
    await fetchPotentialLeaders();
    setShowManageLeadersModal(true);
  };

  const updateGroupLeader = async (leaderId: string) => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('cell_groups')
        .update({ leader_id: leaderId })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchGroups();
      setShowManageLeadersModal(false);
      setSuccess('Group leader updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating group leader:', error);
      setError(`Error updating group leader: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowReportForm(false);
    setShowReportView(false);
    setShowAddMembersModal(false);
    setShowAttendanceModal(false);
    setShowManageLeadersModal(false);
    setShowEditForm(false);
    setShowCancelMeetingModal(false);
    setShowCompleteMeetingModal(false);
    setSelectedGroup(null);
    setSelectedMeeting(null);
    setSelectedReport(null);
    setCancellationReason('');
  };

  const openEditForm = (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to edit this group');
      return;
    }

    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      location: group.location || '',
      meeting_day: group.meeting_day || '',
      meeting_time: group.meeting_time || '',
      leader_id: group.leader_id || '',
    });
    setShowEditForm(true);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.surname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to view any cell groups.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your cell groups, meetings, and reports
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            {canCreateGroups() && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-4 w-4" />
                New Group
              </button>
            )}
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

        {loading && !initialLoad && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-blue-700 font-medium">Processing...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{group.description}</p>
                    )}
                  </div>
                </div>
                
                {checkCanManageGroup(group) && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditForm(group)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                      title="Edit Group"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteGroup(group)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                      title="Delete Group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-4">
                {group.leader && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      Leader: {group.leader.name} {group.leader.surname}
                    </span>
                  </div>
                )}
                
                {group.location && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{group.location}</span>
                  </div>
                )}
                
                {group.meeting_day && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {group.meeting_day}
                      {group.meeting_time && ` at ${group.meeting_time}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openMeetingsModal(group)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Meetings
                </button>
                
                {checkCanManageGroup(group) && (
                  <>
                    <button
                      onClick={() => openAddMembersModal(group)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      title="Add Members"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openManageLeadersModal(group)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      title="Manage Leaders"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredGroups.length === 0 && !initialLoad && (
          <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No groups found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'No cell groups have been created yet'}
            </p>
            {canCreateGroups() && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Your First Group
              </button>
            )}
          </div>
        )}

        {/* Create Group Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Group</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                createGroup();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meeting location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Day
                    </label>
                    <select
                      value={formData.meeting_day}
                      onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Time
                    </label>
                    <input
                      type="time"
                      value={formData.meeting_time}
                      onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Leader
                  </label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select leader</option>
                    {potentialLeaders.map(leader => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name} {leader.surname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
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
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditForm && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Group</h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                updateGroup();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Day
                    </label>
                    <select
                      value={formData.meeting_day}
                      onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Time
                    </label>
                    <input
                      type="time"
                      value={formData.meeting_time}
                      onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Leader
                  </label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select leader</option>
                    {potentialLeaders.map(leader => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name} {leader.surname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Updating...' : 'Update Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Meetings Modal */}
        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedGroup.name} - Meetings
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage meetings, attendance, and reports
                  </p>
                </div>
                <div className="flex gap-3">
                  {checkCanManageGroup(selectedGroup) && (
                    <button
                      onClick={() => {
                        setMeetingFormData({
                          meeting_date: '',
                          meeting_time: '',
                          location: selectedGroup.location || '',
                          topic: '',
                          notes: ''
                        });
                        // You would set state to show meeting creation form here
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      New Meeting
                    </button>
                  )}
                  <button
                    onClick={closeAllModals}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Meetings</h4>
                  <div className="space-y-4">
                    {meetings.filter(m => m.status === 'scheduled').length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">No upcoming meetings</p>
                      </div>
                    ) : (
                      meetings.filter(m => m.status === 'scheduled').map((meeting) => (
                        <div key={meeting.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {new Date(meeting.meeting_date).toLocaleDateString()}
                                {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                              </div>
                              {meeting.topic && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Topic: {meeting.topic}
                                </div>
                              )}
                              {meeting.location && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Location: {meeting.location}
                                </div>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                              scheduled
                            </span>
                          </div>
                          
                          {checkCanManageGroup(selectedGroup) && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <button
                                onClick={() => openAttendanceModal(meeting)}
                                className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                              >
                                <Users className="h-3 w-3" />
                                Attendance
                              </button>
                              <button
                                onClick={() => openReportForm(meeting)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                Create Report
                              </button>
                              <button
                                onClick={() => openCompleteMeetingModal(meeting)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Complete
                              </button>
                              <button
                                onClick={() => openCancelMeetingModal(meeting)}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                <Ban className="h-3 w-3" />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meeting Reports</h4>
                  <div className="space-y-4">
                    {meetingReports.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">No meeting reports</p>
                      </div>
                    ) : (
                      meetingReports.map((report) => (
                        <div key={report.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {report.meeting ? 
                                  new Date(report.meeting.meeting_date).toLocaleDateString() : 
                                  'General Report'
                                }
                              </div>
                              {report.author && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  By: {report.author.name} {report.author.surname}
                                </div>
                              )}
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                {report.report_text}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => viewReport(report)}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            View Report
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Meeting Modal */}
        {showCancelMeetingModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Cancel Meeting
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You are about to cancel the meeting scheduled for{' '}
                  <span className="font-semibold">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </span>
                </p>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please provide a reason for cancelling this meeting..."
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This reason will be visible to all group members
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelMeeting}
                  disabled={loading || !cancellationReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Ban className="h-4 w-4" />
                  {loading ? 'Cancelling...' : 'Cancel Meeting'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Meeting Modal */}
        {showCompleteMeetingModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Complete Meeting
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Mark the meeting scheduled for{' '}
                  <span className="font-semibold">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </span>
                  {' '}as completed?
                </p>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">All requirements met:</span>
                  </div>
                  <ul className="ml-6 space-y-1 text-sm text-green-600 dark:text-green-400">
                    <li>✓ Attendance recorded for all members</li>
                    <li>✓ Meeting report completed</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Once completed, this meeting cannot be edited further.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={completeMeeting}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Completing...' : 'Mark as Complete'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && selectedMeeting && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Mark attendance for all members before saving
                  </p>
                </div>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {members.filter(member => member.cell_group_id === selectedGroup.id).map(member => (
                  <div key={member.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          {member.email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttendanceChange(member.id, 'present')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'present'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Present
                          </button>

                          <button
                            onClick={() => handleAttendanceChange(member.id, 'absent')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'absent'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            Absent
                          </button>

                          <button
                            onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'absent_with_reason'
                                ? 'bg-orange-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            Absent w/ Reason
                          </button>
                        </div>
                      </div>

                      {attendanceFormData[member.id] === 'absent_with_reason' && (
                        <div className="mt-3 pl-4 border-l-4 border-orange-500">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason for Absence *
                          </label>
                          <input
                            type="text"
                            value={absenceReasons[member.id] || ''}
                            onChange={(e) => handleReasonChange(member.id, e.target.value)}
                            placeholder="Enter reason for absence..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      )}

                      {!attendanceFormData[member.id] && (
                        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                          ⚠️ Please mark attendance for this member
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={saveAttendance}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Attendance'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Report Form Modal */}
        {showReportForm && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Meeting Report
                </h3>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                createMeetingReport();
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Associated Meeting
                  </label>
                  <select
                    value={reportFormData.meeting_id}
                    onChange={(e) => setReportFormData({ ...reportFormData, meeting_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a meeting</option>
                    {meetings.map(meeting => (
                      <option key={meeting.id} value={meeting.id}>
                        {new Date(meeting.meeting_date).toLocaleDateString()} - {meeting.topic || 'No topic'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Report Text *
                  </label>
                  <textarea
                    value={reportFormData.report_text}
                    onChange={(e) => setReportFormData({ ...reportFormData, report_text: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the main content of the meeting report..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decisions Made (Optional)
                  </label>
                  <textarea
                    value={reportFormData.decisions_made}
                    onChange={(e) => setReportFormData({ ...reportFormData, decisions_made: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List any decisions that were made during the meeting..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action Items (Optional)
                  </label>
                  <textarea
                    value={reportFormData.action_items}
                    onChange={(e) => setReportFormData({ ...reportFormData, action_items: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List any action items with responsible parties..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Next Meeting Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={reportFormData.next_meeting_date}
                    onChange={(e) => setReportFormData({ ...reportFormData, next_meeting_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : 'Create Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Members Modal */}
        {showAddMembersModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Add Members to {selectedGroup.name}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {availableMembers.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No available members to add</p>
                  </div>
                ) : (
                  availableMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </div>
                        {member.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (selectedMembers.includes(member.id)) {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                          } else {
                            setSelectedMembers([...selectedMembers, member.id]);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          selectedMembers.includes(member.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {selectedMembers.includes(member.id) ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {availableMembers.length > 0 && (
                <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={addMembersToGroup}
                    disabled={loading || selectedMembers.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    {loading ? 'Adding...' : `Add ${selectedMembers.length} Members`}
                  </button>
                  <button
                    onClick={closeAllModals}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Leaders Modal */}
        {showManageLeadersModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manage Leaders for {selectedGroup.name}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {potentialLeaders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No potential leaders found</p>
                  </div>
                ) : (
                  potentialLeaders.map(leader => (
                    <div key={leader.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {leader.name} {leader.surname}
                        </div>
                        {leader.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {leader.email}
                          </div>
                        )}
                        {leader.role && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Role: {leader.role}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => updateGroupLeader(leader.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        {loading ? 'Updating...' : 'Set as Leader'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => updateGroupLeader('')}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <User className="h-4 w-4" />
                  Remove Leader
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Report Modal */}
        {showReportView && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Meeting Report
                  {selectedReport.meeting && (
                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 block mt-1">
                      {new Date(selectedReport.meeting.meeting_date).toLocaleDateString()}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowReportView(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedReport.author && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Created by: {selectedReport.author.name} {selectedReport.author.surname}
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Report</h4>
                  <div className="prose dark:prose-invert max-w-none">
                    {selectedReport.report_text.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 text-gray-700 dark:text-gray-300">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {selectedReport.decisions_made && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Decisions Made</h4>
                    <div className="prose dark:prose-invert max-w-none">
                      {selectedReport.decisions_made.split('\n').map((decision, index) => (
                        <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
                          {decision}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.action_items && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Action Items</h4>
                    <div className="prose dark:prose-invert max-w-none">
                      {selectedReport.action_items.split('\n').map((action, index) => (
                        <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
                          {action}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.next_meeting_date && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Next Meeting</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(selectedReport.next_meeting_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
