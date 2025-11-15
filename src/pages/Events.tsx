import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, FileText, Save, Eye, Clock, CheckCircle, XCircle, UserPlus, Mail, Phone, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

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
  members?: any[];
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

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showManageLeadersModal, setShowManageLeadersModal] = useState(false);
  const [showCancelMeetingModal, setShowCancelMeetingModal] = useState(false);
  const [showCompleteMeetingModal, setShowCompleteMeetingModal] = useState(false);
  
  const [Groups, setGroups] = useState<CellGroup[]>([]);
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
  const [cancellationReason, setCancellationReason] = useState('');
  
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

  // Permission check functions using the auth context
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

  // Enhanced permission checks using auth context methods
  const checkCanManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canManageGroup(group.id) || canManageAllGroups();
  };

  const checkCanViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canViewGroup(group.id) || canViewAllGroups();
  };

  // Filter cell groups based on user permissions
  const getFilteredGroups = () => {
    if (!profile) return [];

    // Admin and users with view_all_groups can see all cell groups
    if (canViewAllGroups()) {
      return allGroups;
    }

    // Get user's accessible groups from auth context
    const userGroupIds = getUserGroups();
    
    // Filter groups based on user's accessible groups
    const userGroups = allGroups.filter(group => 
      userGroupIds.includes(group.id) || 
      userGroupIds.includes('all_groups') ||
      (profile.cell_group_id && profile.cell_group_id === group.id)
    );

    return userGroups;
  };

  // Fetch all cell groups with members and leaders
  const fetchGroups = async () => {
    try {
      // First fetch all cell groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;
      
      // Then fetch all members with their cell groups
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, email, phone, cell_group_id, role, is_leader')
        .order('name');

      if (membersError) {
        console.error('Error fetching members:', membersError);
      }

      // Combine the data
      const groupsWithMembers = (groupsData || []).map(group => {
        const groupMembers = (membersData || []).filter(member => 
          member.cell_group_id === group.id
        );
        
        // Find leader if leader_id exists
        const leader = group.leader_id ? 
          (membersData || []).find(member => member.id === group.leader_id) : null;

        return {
          ...group,
          members: groupMembers,
          leader: leader ? {
            id: leader.id,
            name: leader.name,
            surname: leader.surname,
            email: leader.email,
            phone: leader.phone
          } : null
        };
      });
      
      setAllGroups(groupsWithMembers);
      
    } catch (error) {
      console.error('Error fetching cell groups:', error);
      throw error;
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
      throw error;
    }
  };

  const fetchAvailableMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`cell_group_id.is.null,cell_group_id.eq.${groupId}`)
        .order('name');

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error) {
      console.error('Error fetching available members:', error);
      setAvailableMembers([]);
    }
  };

  const fetchPotentialLeaders = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or('role.eq.admin,role.eq.group_leader,role.eq.leader,is_leader.eq.true')
        .order('name');

      if (error) throw error;
      setPotentialLeaders(data || []);
    } catch (error) {
      console.error('Error fetching potential leaders:', error);
      setPotentialLeaders([]);
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
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    }
  };

  const fetchMeetingReports = async (groupId: string) => {
    try {
      const { data, error } = await supabase
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
      setMeetingReports([]);
    }
  };

  const fetchAttendance = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          member:members(*)
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;
      
      const attendanceData = data || [];
      setAttendance(attendanceData);

      // Initialize form data
      const initialFormData: {[key: string]: 'present' | 'absent' | 'absent_with_reason'} = {};
      const initialReasons: {[key: string]: string} = {};
      
      attendanceData.forEach((record: Attendance) => {
        initialFormData[record.member_id] = record.status;
        if (record.reason) {
          initialReasons[record.member_id] = record.reason;
        }
      });
      
      setAttendanceFormData(initialFormData);
      setAbsenceReasons(initialReasons);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
    }
  };

  // Check if meeting has attendance recorded
  const checkMeetingHasAttendance = async (meetingId: string, groupId: string): Promise<boolean> => {
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('meeting_id', meetingId);

      const groupMembers = members.filter(m => m.cell_group_id === groupId);
      
      return attendanceData && attendanceData.length === groupMembers.length && groupMembers.length > 0;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  };

  // Check if meeting has report
  const checkMeetingHasReport = async (meetingId: string): Promise<boolean> => {
    try {
      const { data: reportData } = await supabase
        .from('meeting_reports')
        .select('*')
        .eq('meeting_id', meetingId);

      return reportData && reportData.length > 0;
    } catch (error) {
      console.error('Error checking report:', error);
      return false;
    }
  };

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Determine access based on permissions from auth context
      const userHasAccess = 
        hasPermission('view_all_groups') ||
        hasPermission('view_own_group') ||
        hasPermission('manage_all_groups') ||
        hasPermission('manage_own_group') ||
        profile.role === 'admin' ||
        (profile.assigned_groups && profile.assigned_groups.length > 0) ||
        profile.cell_group_id !== null;
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Update filtered cell groups when allGroups or profile changes
  useEffect(() => {
    if (allGroups.length > 0 && profile) {
      const filtered = getFilteredGroups();
      setGroups(filtered);
    }
  }, [allGroups, profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchGroups(),
        fetchMembers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load cell groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const openAddMembersModal = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to add members to this group');
      return;
    }

    setSelectedGroup(group);
    setSelectedMembers([]);
    await fetchAvailableMembers(group.id);
    setShowAddMembersModal(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const addSelectedMembers = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Update each selected member's cell_group_id directly in members table
      const updates = selectedMembers.map(memberId => 
        supabase
          .from('members')
          .update({ cell_group_id: selectedGroup.id })
          .eq('id', memberId)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to add some members');
      }

      await fetchGroups();
      await fetchAvailableMembers(selectedGroup.id);
      setSelectedMembers([]);
      setSuccess(`${selectedMembers.length} member(s) added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding members:', error);
      setError(`Error adding members: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return;

    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      setLoading(true);
      // Set cell_group_id to null to remove from group
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);

      if (error) throw error;

      await fetchGroups();
      await fetchAvailableMembers(selectedGroup.id);
      setSuccess('Member removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing member:', error);
      setError(`Error removing member: ${error.message}`);
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

      // Update meeting status to cancelled with reason
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
      setSelectedMeeting(null);
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

    // Check if attendance has been recorded for all members
    const hasAttendance = await checkMeetingHasAttendance(meeting.id, selectedGroup.id);

    if (!hasAttendance) {
      setError('Cannot complete meeting: Attendance must be recorded for all members');
      return;
    }

    // Check if report has been created
    const hasReport = await checkMeetingHasReport(meeting.id);

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
      setSelectedMeeting(null);
    } catch (error: any) {
      console.error('Error completing meeting:', error);
      setError(`Error completing meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Attendance Functions
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

    // Clear reason if status is not absent_with_reason
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

      // Get all group members
      const attendanceRecords = groupMembers.map(member => {
        const status = attendanceFormData[member.id] || 'present';
        const reason = status === 'absent_with_reason' ? absenceReasons[member.id] || '' : null;

        return {
          meeting_id: selectedMeeting.id,
          member_id: member.id,
          status,
          reason
        };
      });

      // Delete existing attendance for this meeting
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      // Insert new attendance records
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

  // Leader Management Functions
  const openManageLeadersModal = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to manage leaders for this group');
      return;
    }

    setSelectedGroup(group);
    await fetchPotentialLeaders();
    setShowManageLeadersModal(true);
  };

  const assignLeader = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('cell_groups')
        .update({ leader_id: memberId })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchGroups();
      setSuccess('Leader assigned successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowManageLeadersModal(false);
    } catch (error: any) {
      console.error('Error assigning leader:', error);
      setError(`Error assigning leader: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeLeader = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('cell_groups')
        .update({ leader_id: null })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchGroups();
      setSuccess('Leader removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowManageLeadersModal(false);
    } catch (error: any) {
      console.error('Error removing leader:', error);
      setError(`Error removing leader: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Meeting Reports Functions
  const createMeetingReport = async () => {
    if (!profile) {
      setError('You must be logged in to create reports');
      return;
    }

    if (!reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }

      setShowReportForm(false);
      setReportFormData({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      setSuccess('Meeting report created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating meeting report:', error);
      setError(`Error creating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingReport = async () => {
    if (!selectedReport || !profile) {
      setError('Invalid request');
      return;
    }

    if (!reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meeting_reports')
        .update({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }

      setShowReportForm(false);
      setSelectedReport(null);
      setReportFormData({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      setSuccess('Meeting report updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating meeting report:', error);
      setError(`Error updating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeetingReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this meeting report? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('meeting_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }
      
      setSuccess('Meeting report deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting meeting report:', error);
      setError(`Error deleting meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!selectedGroup || !profile) {
      setError('Invalid request');
      return;
    }

    if (!meetingFormData.meeting_date) {
      setError('Meeting date is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .insert({
          group_id: selectedGroup.id,
          meeting_date: meetingFormData.meeting_date,
          meeting_time: meetingFormData.meeting_time || null,
          location: meetingFormData.location || null,
          topic: meetingFormData.topic || null,
          notes: meetingFormData.notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      await fetchMeetings(selectedGroup.id);
      setMeetingFormData({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
      
      setSuccess('Meeting created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(`Error creating meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
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

  const openEditReportForm = (report: MeetingReport) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to edit reports for this group');
      return;
    }

    setSelectedReport(report);
    setReportFormData({
      meeting_id: report.meeting_id || '',
      report_text: report.report_text,
      decisions_made: report.decisions_made || '',
      action_items: report.action_items || '',
      next_meeting_date: report.next_meeting_date || ''
    });
    setShowReportForm(true);
  };

  const openReportView = (report: MeetingReport) => {
    setSelectedReport(report);
    setShowReportView(true);
  };

  const openEditForm = (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to edit this cell group');
      return;
    }

    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      location: group.location || '',
      meeting_day: group.meeting_day || '',
      meeting_time: group.meeting_time || '',
      leader_id: group.leader_id || ''
    });
    setShowEditForm(true);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowReportsModal(false);
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
    setSelectedMembers([]);
    setMeetings([]);
    setMeetingReports([]);
    setAttendance([]);
    setCancellationReason('');
    setMeetingFormData({
      meeting_date: '',
      meeting_time: '',
      location: '',
      topic: '',
      notes: ''
    });
    setReportFormData({
      meeting_id: '',
      report_text: '',
      decisions_made: '',
      action_items: '',
      next_meeting_date: ''
    });
    setAttendanceFormData({});
    setAbsenceReasons({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission - only admin or users with manage_all_groups permission can create groups
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups. Only administrators and users with manage_all_groups permission can create new cell groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!formData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      const { error } = await supabase.from('cell_groups').insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        leader_id: formData.leader_id || null,
      });

      if (error) throw error;

      await fetchGroups();
      setShowForm(false);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
      setSuccess('Cell group created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating cell group:', error);
      setError(`Error creating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to edit this cell group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('cell_groups')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          meeting_day: formData.meeting_day || null,
          meeting_time: formData.meeting_time || null,
          leader_id: formData.leader_id || null,
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchGroups();
      setShowEditForm(false);
      setSelectedGroup(null);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
      setSuccess('Cell group updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  // Filter groups based on search term
  const filteredGroups = Groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.surname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading while checking permissions
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission to access cell groups
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access the cell groups section.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your role: {profile?.role || 'member'}
          </p>
          {profile?.assigned_groups && profile.assigned_groups.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Assigned groups: {profile.assigned_groups.join(', ')}
            </p>
          )}

        {/* Cell Groups List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cell groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {canViewAllGroups() ? 'No Cell Groups Yet' : 'No Access to Cell Groups'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {canViewAllGroups()
                  ? 'Create your first cell group to get started' 
                  : 'You are not a member of any cell groups'
                }
              </p>
              {canCreateGroups() && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Create First Cell Group
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const canManage = checkCanManageGroup(group);
              const canView = checkCanViewGroup(group);
              
              return (
                <div
                  key={group.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                      {canManage ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium mb-2">
                          <Shield className="h-3 w-3 mr-1" />
                          Can Manage
                        </span>
                      ) : canView ? (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium mb-2">
                          <Shield className="h-3 w-3 mr-1" />
                          View Only
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    
                    {group.location && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{group.location}</span>
                      </div>
                    )}
                    
                    {(group.meeting_day || group.meeting_time) && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                        </span>
                      </div>
                    )}
                    
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openMeetingsModal(group)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Meetings
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => openAddMembersModal(group)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Add members"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openManageLeadersModal(group)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Manage leaders"
                          >
                            <User className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditForm(group)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Edit group"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {canManageAllGroups()
                ? 'Full administrative access to all cell groups' 
                : canViewAllGroups()
                ? 'Can view all cell groups'
                : profile?.role === 'group_leader'
                ? `Managing ${profile?.assigned_groups?.length || 0} assigned group(s)`
                : `Viewing your cell group - ${profile?.role} access`
              }
            </p>
          </div>
          {canCreateGroups() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Create Cell Group'}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search cell groups..."
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

        {/* Create Cell Group Form */}
        {showForm && canCreateGroups() && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Cell Group</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cell group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meeting location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Day</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader (Optional)</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a leader</option>
                    {members.filter(m => m.is_leader || m.role === 'admin' || m.role === 'group_leader').map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
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
                  {loading ? 'Creating...' : 'Create Cell Group'}
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

        {/* Edit Cell Group Form */}
        {showEditForm && selectedGroup && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Cell Group</h2>
            <form onSubmit={handleUpdateGroup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cell group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meeting location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Day</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No leader assigned</option>
                    {members.filter(m => m.is_leader || m.role === 'admin' || m.role === 'group_leader').map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
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
                  <Save className="h-5 w-5" />
                  {loading ? 'Updating...' : 'Update Cell Group'}
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
        )}
        {/* Loading State */}
        {loading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-6">
          {!loading && events.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Events Yet</h3>
              <p className="text-gray-500 dark:text-gray-500">Create your first event to get started</p>
            </div>
          ) : (
            events.map((event) => {
              const presentAttendees = getPresentAttendees(event.id);
              const absentAttendees = getAbsentAttendees(event.id);
              const scopeBadge = getEventScopeBadge(event);
              const statusBadge = getEventStatusBadge(event);
              const ScopeIcon = scopeBadge.icon;
              const StatusIcon = statusBadge.icon;
              
              return (
                <div key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02]">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <CalendarIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${statusBadge.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.text}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${scopeBadge.color}`}>
                              <ScopeIcon className="h-3 w-3" />
                              {scopeBadge.text}
                            </span>
                          </div>
                          {event.topic && (
                            <p className="text-blue-600 dark:text-blue-400 font-medium">{event.topic}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-gray-600 dark:text-gray-400 ml-18">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium">{formatDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{formatTime(event.event_time)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Attendance Summary */}
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{presentAttendees.length}</div>
                          <div className="text-sm text-green-700 dark:text-green-300 font-medium">Present</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{absentAttendees.length}</div>
                          <div className="text-sm text-red-700 dark:text-red-300 font-medium">Absent</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {presentAttendees.filter(a => a.first_time).length}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">First Timers</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 lg:w-48">
                      {!event.is_completed && (
                        <>
                          <button
                            onClick={() => setShowAttendeeForm(showAttendeeForm === event.id ? null : event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Add Attendee
                          </button>
                          <button
                            onClick={() => handleCompleteEvent(event.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Complete Event
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => togglePresentList(event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>{showPresentList[event.id] ? 'Hide' : 'View'} Present ({presentAttendees.length})</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showPresentList[event.id] ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleAbsentList(event.id)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                      >
                        <span>{showAbsentList[event.id] ? 'Hide' : 'View'} Absent ({absentAttendees.length})</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAbsentList[event.id] ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Add Attendee Form */}
                  {showAttendeeForm === event.id && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Attendee</h4>
                      <form onSubmit={(e) => handleAttendeeSubmit(e, event.id)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Member Search */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setIsMemberDropdownOpen(true);
                                }}
                                onFocus={() => setIsMemberDropdownOpen(true)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search members..."
                              />
                              <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                              
                              {isMemberDropdownOpen && filteredMembers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                  {filteredMembers.map((member) => (
                                    <div
                                      key={member.id}
                                      onClick={() => handleMemberSelect(member)}
                                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                        {getInitials(member.name, member.surname)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {member.name} {member.surname}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {member.phone || member.email}
                                        </div>
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(member.status).color}`}>
                                        {getStatusBadge(member.status).text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inviter Search */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invited By (Optional)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={inviterSearchTerm}
                                onChange={(e) => {
                                  setInviterSearchTerm(e.target.value);
                                  setIsInviterDropdownOpen(true);
                                }}
                                onFocus={() => setIsInviterDropdownOpen(true)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Search inviter..."
                              />
                              <Search className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                              
                              {isInviterDropdownOpen && filteredInviters.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                  {filteredInviters.map((member) => (
                                    <div
                                      key={member.id}
                                      onClick={() => handleInviterSelect(member)}
                                      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                        {getInitials(member.name, member.surname)}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {member.name} {member.surname}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {member.phone || member.email}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* First Time Checkbox */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="firstTime"
                            checked={attendeeFormData.firstTime}
                            onChange={(e) => setAttendeeFormData({ ...attendeeFormData, firstTime: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label htmlFor="firstTime" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            First time attending an event
                          </label>
                        </div>

                        {/* Selected Member Preview */}
                        {selectedMember && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                  {getInitials(selectedMember.name, selectedMember.surname)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {selectedMember.name} {selectedMember.surname}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedMember.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedMember.phone}</span>}
                                    {selectedMember.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedMember.email}</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMember(null);
                                  setAttendeeFormData({ ...attendeeFormData, memberId: '' });
                                  setSearchTerm('');
                                }}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Form Actions */}
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={loading || !attendeeFormData.memberId}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                            {loading ? 'Adding...' : 'Add Attendee'}
                          </button>
                          <button
                            type="button"
                            onClick={resetAttendeeForm}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Present Attendees List */}
                  {showPresentList[event.id] && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Present Attendees ({presentAttendees.length})
                      </h4>
                      {presentAttendees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No attendees yet</p>
                          <p className="text-sm">Add attendees using the "Add Attendee" button</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {presentAttendees.map((attendee) => (
                            <div key={attendee.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(attendee.members.name, attendee.members.surname)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                        {attendee.members.name} {attendee.members.surname}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(attendee.members.status).color}`}>
                                          {getStatusBadge(attendee.members.status).text}
                                        </span>
                                        {attendee.first_time && (
                                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                                            First Time
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                                          Present
                                        </span>
                                      </div>
                                    </div>
                                    {!event.is_completed && (
                                      <button
                                        onClick={() => handleRemoveAttendee(attendee.id, event.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                                        title="Remove attendee"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {attendee.members.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{attendee.members.phone}</span>
                                      </div>
                                    )}
                                    {attendee.members.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{attendee.members.email}</span>
                                      </div>
                                    )}
                                    {attendee.members.cell_groups?.name && (
                                      <div className="text-xs">
                                        Cell Group: {attendee.members.cell_groups.name}
                                      </div>
                                    )}
                                    {attendee.invited_by_member && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400">
                                        Invited by: {attendee.invited_by_member.name} {attendee.invited_by_member.surname}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Absent Members List */}
                  {showAbsentList[event.id] && event.is_completed && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Absent Members ({absentAttendees.length})
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          {event.is_whole_church ? 
                            'All church members not present' : 
                            'Target group members not present'
                          }
                        </span>
                      </h4>
                      {absentAttendees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No absent members</p>
                          <p className="text-sm">All expected members are present</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {absentAttendees.map((attendee) => (
                            <div key={attendee.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                  {getInitials(attendee.members.name, attendee.members.surname)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-900 dark:text-white truncate">
                                    {attendee.members.name} {attendee.members.surname}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(attendee.members.status).color}`}>
                                      {getStatusBadge(attendee.members.status).text}
                                    </span>
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs">
                                      Absent
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {attendee.members.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" />
                                        <span>{attendee.members.phone}</span>
                                      </div>
                                    )}
                                    {attendee.members.cell_groups?.name && (
                                      <div className="text-xs">
                                        Cell Group: {attendee.members.cell_groups.name}
                                      </div>
                                    )}
                                    {attendee.members.ministry_groups?.name && (
                                      <div className="text-xs">
                                        Ministry: {attendee.members.ministry_groups.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
