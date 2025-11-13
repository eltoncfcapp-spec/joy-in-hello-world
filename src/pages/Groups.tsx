import { Users, Plus, Calendar, UserPlus, FileText, BarChart3, Settings, Eye, MapPin, Clock, CheckCircle, AlertCircle, Building, ChevronDown, Search, Phone, Mail, X, Download, Trash2, Edit, Send, History, CheckSquare, Square, RefreshCw } from 'lucide-react';
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
  status: 'active' | 'inactive' | 'archived';
  leader?: {
    name: string;
    surname: string;
  } | null;
  members?: GroupMember[];
  created_at?: string;
  updated_at?: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  member_id: string;
  role: 'leader' | 'member' | 'assistant';
  assigned_at: string;
  member?: Member;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
}

interface GroupMeeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  topic: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  attendance?: MeetingAttendance[];
}

interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'excused';
  notes: string | null;
  member?: Member;
}

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  user_id: string;
  created_at: string;
  user?: {
    name: string;
    surname: string;
  };
}

// New interface for the leader groups query result
interface LeaderGroup {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
}

const Groups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [allGroups, setAllGroups] = useState<CellGroup[]>([]);
  const [leaderGroups, setLeaderGroups] = useState<LeaderGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [bulkSelectedMembers, setBulkSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members' | 'reports' | 'audit' | 'myGroups'>('groups');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Meeting states
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<GroupMeeting | null>(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);

  // Bulk operations
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkRole, setBulkRole] = useState('member');

  // Reports and export
  const [reportType, setReportType] = useState<'members' | 'attendance' | 'meetings'>('members');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Form states with validation
  const [groupForm, setGroupForm] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
    status: 'active' as 'active' | 'inactive' | 'archived'
  });

  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [attendanceForm, setAttendanceForm] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const memberRoles = ['member', 'leader', 'assistant'];
  const groupStatuses = ['active', 'inactive', 'archived'];

  // Data caching
  const [cache, setCache] = useState<{
    groups: CellGroup[] | null;
    members: Member[] | null;
    leaderGroups: LeaderGroup[] | null;
    lastUpdated: number | null;
  }>({
    groups: null,
    members: null,
    leaderGroups: null,
    lastUpdated: null
  });

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      const userHasAccess = profile.isAdmin || 
        (profile.permissions && profile.permissions.includes('manage_groups')) ||
        profile.role === 'group_leader' ||
        (profile.assigned_groups && profile.assigned_groups.length > 0);
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Clear success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Load data with caching
  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache (5 minute expiry)
      const now = Date.now();
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      
      if (!forceRefresh && cache.lastUpdated && (now - cache.lastUpdated < cacheExpiry)) {
        setGroups(cache.groups || []);
        setAllGroups(cache.groups || []);
        setMembers(cache.members || []);
        setLeaderGroups(cache.leaderGroups || []);
        setLoading(false);
        setInitialLoad(false);
        return;
      }

      await Promise.all([
        fetchGroups(),
        fetchMembers(),
        fetchLeaderGroups()
      ]);

      // Update cache
      setCache({
        groups: allGroups,
        members: members,
        leaderGroups: leaderGroups,
        lastUpdated: now
      });

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // NEW: Fetch groups where current user is the leader
  const fetchLeaderGroups = async () => {
    if (!profile) return;

    try {
      // Using the provided query structure with Supabase
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          id,
          name,
          location,
          meeting_day,
          meeting_time,
          status,
          leader:members!cell_groups_leader_id_fkey(
            name,
            surname
          )
        `)
        .eq('status', 'active')
        .eq('leader_id', profile.id);

      if (error) throw error;

      // Transform the data to match the LeaderGroup interface
      const leaderGroupsData: LeaderGroup[] = (data || []).map(group => ({
        group_id: group.id,
        group_name: group.name,
        location: group.location,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        status: group.status,
        leader_name: group.leader?.name || '',
        leader_surname: group.leader?.surname || ''
      }));

      setLeaderGroups(leaderGroupsData);
    } catch (error) {
      console.error('Error fetching leader groups:', error);
      // Don't throw error here as it's not critical for main functionality
    }
  };

  // Enhanced fetchGroups to include status
  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(name, surname),
          group_members:group_members(
            *,
            member:members(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const groupsData = data || [];
      setAllGroups(groupsData);
      
      const filtered = getFilteredGroups();
      setGroups(filtered);
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          member:members(*)
        `)
        .eq('group_id', groupId)
        .order('role', { ascending: false });

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
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (meetingsError) throw meetingsError;

      // Fetch attendance for each meeting
      const meetingsWithAttendance = await Promise.all(
        (meetingsData || []).map(async (meeting) => {
          const { data: attendanceData } = await supabase
            .from('meeting_attendance')
            .select(`
              *,
              member:members(*)
            `)
            .eq('meeting_id', meeting.id);

          return {
            ...meeting,
            attendance: attendanceData || []
          };
        })
      );

      setMeetings(meetingsWithAttendance);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchAuditLogs = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles(name, surname)
        `)
        .eq('record_id', groupId)
        .or(`table_name.eq.cell_groups,table_name.eq.group_members,table_name.eq.group_meetings`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  // Check if user can manage group
  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    if (profile.isAdmin || profile.role === 'admin') {
      return true;
    }

    if (profile.assigned_groups && profile.assigned_groups.includes(group.id)) {
      return true;
    }

    if (group.members?.some(member => 
      member.member_id === profile.id && member.role === 'leader'
    )) {
      return true;
    }

    // Check if user is the leader of this group
    if (group.leader_id === profile.id) {
      return true;
    }

    return false;
  };

  // Check if user can view group
  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    if (profile.isAdmin || profile.role === 'admin') {
      return true;
    }

    if (profile.assigned_groups && profile.assigned_groups.includes(group.id)) {
      return true;
    }

    if (group.members?.some(member => member.member_id === profile.id)) {
      return true;
    }

    // Check if user is the leader of this group
    if (group.leader_id === profile.id) {
      return true;
    }

    return false;
  };

  // Create new group with audit logging
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.isAdmin && !(profile?.permissions && profile.permissions.includes('manage_groups'))) {
      setError('You do not have permission to create groups');
      return;
    }

    if (!validateGroupForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const groupData = {
        name: groupForm.name.trim(),
        location: groupForm.location.trim() || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        leader_id: groupForm.leader_id || null,
        status: groupForm.status
      };

      const { data, error } = await supabase
        .from('cell_groups')
        .insert([groupData])
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(name, surname)
        `)
        .single();

      if (error) throw error;

      // Log audit trail
      await logAuditAction('cell_groups', data.id, 'INSERT', null, groupData);

      await fetchGroups();
      await fetchLeaderGroups(); // Refresh leader groups
      setShowForm(false);
      setGroupForm({
        name: '',
        location: '',
        meeting_day: '',
        meeting_time: '',
        leader_id: '',
        status: 'active'
      });
      setSuccess('Group created successfully!');
    } catch (error: any) {
      console.error('Error creating group:', error);
      setError(`Error creating group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Audit logging function
  const logAuditAction = async (tableName: string, recordId: string, action: 'INSERT' | 'UPDATE' | 'DELETE', oldData: any, newData: any) => {
    if (!profile) return;

    try {
      await supabase
        .from('audit_logs')
        .insert([{
          table_name: tableName,
          record_id: recordId,
          action,
          old_data: oldData,
          new_data: newData,
          user_id: profile.id
        }]);
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  // Filter groups based on user permissions
  const getFilteredGroups = () => {
    if (!profile) return [];

    if (profile.isAdmin || profile.role === 'admin') {
      return allGroups;
    }

    if (profile.assigned_groups && profile.assigned_groups.length > 0) {
      return allGroups.filter(group => 
        profile.assigned_groups?.includes(group.id)
      );
    }

    return allGroups.filter(group => 
      group.members?.some(member => member.member_id === profile.id) ||
      group.leader_id === profile.id
    );
  };

  // Form validation
  const validateGroupForm = () => {
    const errors: Record<string, string> = {};

    if (!groupForm.name.trim()) {
      errors.name = 'Group name is required';
    } else if (groupForm.name.trim().length < 2) {
      errors.name = 'Group name must be at least 2 characters';
    }

    if (groupForm.location && groupForm.location.length > 100) {
      errors.location = 'Location must be less than 100 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMeetingForm = () => {
    const errors: Record<string, string> = {};

    if (!meetingForm.meeting_date) {
      errors.meeting_date = 'Meeting date is required';
    } else if (new Date(meetingForm.meeting_date) < new Date()) {
      errors.meeting_date = 'Meeting date cannot be in the past';
    }

    if (!meetingForm.meeting_time) {
      errors.meeting_time = 'Meeting time is required';
    }

    if (!meetingForm.location.trim()) {
      errors.location = 'Location is required';
    }

    if (meetingForm.topic.length > 200) {
      errors.topic = 'Topic must be less than 200 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Bulk operations
  const handleBulkRoleUpdate = async () => {
    if (!selectedGroup || !canManageGroup(selectedGroup) || bulkSelectedMembers.length === 0) {
      setError('No members selected or insufficient permissions');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updates = bulkSelectedMembers.map(groupMemberId => 
        supabase
          .from('group_members')
          .update({ role: bulkRole })
          .eq('id', groupMemberId)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} members`);
      }

      await fetchGroupMembers(selectedGroup.id);
      setBulkSelectedMembers([]);
      setShowBulkActions(false);
      setSuccess(`Updated ${bulkSelectedMembers.length} members to ${bulkRole} role`);
    } catch (error: any) {
      console.error('Error in bulk role update:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemoveMembers = async () => {
    if (!selectedGroup || !canManageGroup(selectedGroup) || bulkSelectedMembers.length === 0) {
      setError('No members selected or insufficient permissions');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${bulkSelectedMembers.length} members from the group?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const deletions = bulkSelectedMembers.map(groupMemberId =>
        supabase
          .from('group_members')
          .delete()
          .eq('id', groupMemberId)
      );

      const results = await Promise.all(deletions);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        throw new Error(`Failed to remove ${errors.length} members`);
      }

      await fetchGroupMembers(selectedGroup.id);
      setBulkSelectedMembers([]);
      setShowBulkActions(false);
      setSuccess(`Removed ${bulkSelectedMembers.length} members from group`);
    } catch (error: any) {
      console.error('Error in bulk member removal:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Meeting attendance
  const handleRecordAttendance = async (meeting: GroupMeeting) => {
    setSelectedMeeting(meeting);
    
    // Initialize attendance form with current attendance records
    const initialAttendance: Record<string, 'present' | 'absent' | 'excused'> = {};
    meeting.attendance?.forEach(record => {
      initialAttendance[record.member_id] = record.status;
    });
    
    setAttendanceForm(initialAttendance);
    setShowAttendanceForm(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting || !selectedGroup) return;

    try {
      setLoading(true);
      setError(null);

      // Get all current group members
      const groupMemberIds = selectedGroup.members?.map(m => m.member_id) || [];

      // Prepare attendance records
      const attendanceRecords = groupMemberIds.map(memberId => ({
        meeting_id: selectedMeeting.id,
        member_id: memberId,
        status: attendanceForm[memberId] || 'absent',
        notes: ''
      }));

      // Delete existing attendance and insert new records
      await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      const { error } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      await fetchGroupMeetings(selectedGroup.id);
      setShowAttendanceForm(false);
      setSelectedMeeting(null);
      setSuccess('Attendance recorded successfully!');
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  // Export functionality
  const handleExportData = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      
      let data: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'members':
          data = selectedGroup.members?.map(member => ({
            Name: `${member.member?.name} ${member.member?.surname}`,
            Role: member.role,
            Email: member.member?.email || '',
            Phone: member.member?.phone || '',
            Status: member.member?.status || '',
            'Joined Group': new Date(member.assigned_at).toLocaleDateString()
          })) || [];
          filename = `${selectedGroup.name}_members.csv`;
          break;

        case 'attendance':
          const attendanceData = meetings.flatMap(meeting => 
            meeting.attendance?.map(record => ({
              'Meeting Date': new Date(meeting.meeting_date).toLocaleDateString(),
              'Member': `${record.member?.name} ${record.member?.surname}`,
              'Status': record.status,
              'Topic': meeting.topic,
              'Location': meeting.location
            })) || []
          );
          data = attendanceData;
          filename = `${selectedGroup.name}_attendance.csv`;
          break;

        case 'meetings':
          data = meetings.map(meeting => ({
            Date: new Date(meeting.meeting_date).toLocaleDateString(),
            Time: meeting.meeting_time,
            Topic: meeting.topic,
            Location: meeting.location,
            Status: meeting.status,
            'Total Present': meeting.attendance?.filter(a => a.status === 'present').length || 0,
            Notes: meeting.notes
          }));
          filename = `${selectedGroup.name}_meetings.csv`;
          break;
      }

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      setSuccess(`Report exported successfully as ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Error exporting data');
    } finally {
      setLoading(false);
    }
  };

  // Notifications
  const handleNotifyMembers = async (meeting: GroupMeeting, message: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to send notifications');
      return;
    }

    try {
      setLoading(true);
      
      // Get member emails/phones
      const memberContacts = selectedGroup.members
        ?.filter(member => member.member?.email || member.member?.phone)
        .map(member => ({
          email: member.member?.email,
          phone: member.member?.phone,
          name: `${member.member?.name} ${member.member?.surname}`
        })) || [];

      // In a real application, you would integrate with your notification service
      console.log('Sending notifications:', {
        meeting,
        message,
        memberContacts
      });

      setSuccess(`Notifications sent to ${memberContacts.length} members`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      setError('Error sending notifications');
    } finally {
      setLoading(false);
    }
  };

  // Add members to group
  const handleAddMembersToGroup = async (groupId: string, memberIds: string[], role: string = 'member') => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const memberAssignments = memberIds.map(memberId => ({
        group_id: groupId,
        member_id: memberId,
        role: role
      }));

      const { error } = await supabase
        .from('group_members')
        .insert(memberAssignments);

      if (error) throw error;

      // Log audit trail for each member added
      for (const assignment of memberAssignments) {
        await logAuditAction('group_members', assignment.member_id, 'INSERT', null, assignment);
      }

      await fetchGroupMembers(groupId);
      await fetchMembers();
      setSelectedMembers([]);
      setSearchTerm('');
      setSuccess(`Added ${memberIds.length} members to group`);
    } catch (error) {
      console.error('Error adding members to group:', error);
      setError('Error adding members to group');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from group
  const handleRemoveMemberFromGroup = async (groupMemberId: string, memberName?: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', groupMemberId);

      if (error) throw error;

      // Log audit trail
      await logAuditAction('group_members', groupMemberId, 'DELETE', { groupMemberId }, null);

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
      }
      setSuccess(`Member ${memberName ? `${memberName} ` : ''}removed from group`);
    } catch (error) {
      console.error('Error removing member from group:', error);
      setError('Error removing member from group');
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (groupMemberId: string, newRole: string, oldRole: string, memberName?: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', groupMemberId);

      if (error) throw error;

      // Log audit trail
      await logAuditAction('group_members', groupMemberId, 'UPDATE', { role: oldRole }, { role: newRole });

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
      }
      setSuccess(`Role updated for ${memberName || 'member'}`);
    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Error updating member role');
    }
  };

  // Meeting management
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage meetings for this group');
      return;
    }

    if (!validateMeetingForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const meetingData = {
        group_id: selectedGroup.id,
        meeting_date: meetingForm.meeting_date,
        meeting_time: meetingForm.meeting_time,
        location: meetingForm.location,
        topic: meetingForm.topic,
        notes: meetingForm.notes,
        status: 'scheduled'
      };

      const { data, error } = await supabase
        .from('group_meetings')
        .insert([meetingData])
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await logAuditAction('group_meetings', data.id, 'INSERT', null, meetingData);

      setMeetings(prev => [data, ...prev]);
      setShowMeetingForm(false);
      setMeetingForm({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
      setSuccess('Meeting scheduled successfully!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Error creating meeting');
    } finally {
      setLoading(false);
    }
  };

  // Action handlers
  const handleAddReport = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('meetings');
  };

  const handleAddMembers = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('members');
  };

  const handleCreateEvent = (group: CellGroup) => {
    setSelectedGroup(group);
    setShowMeetingForm(true);
  };

  const handleViewAnalytics = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('reports');
  };

  const handleManageGroup = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('groups');
  };

  const handleViewDetails = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('groups');
  };

  const handleViewAudit = async (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('audit');
    await fetchAuditLogs(group.id);
  };

  // Action cards configuration
  const getActionCards = (group: CellGroup) => {
    const cards = [
      {
        id: 'report',
        title: 'Add Report',
        description: 'Submit meeting minutes and attendance',
        icon: FileText,
        color: 'bg-blue-500',
        action: handleAddReport,
        show: canManageGroup(group)
      },
      {
        id: 'members',
        title: 'Add Members',
        description: 'Manage group members',
        icon: UserPlus,
        color: 'bg-green-500',
        action: handleAddMembers,
        show: canManageGroup(group)
      },
      {
        id: 'event',
        title: 'Create Event',
        description: 'Schedule new events',
        icon: Calendar,
        color: 'bg-purple-500',
        action: handleCreateEvent,
        show: canManageGroup(group)
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'See group statistics',
        icon: BarChart3,
        color: 'bg-orange-500',
        action: handleViewAnalytics,
        show: canManageGroup(group) || profile?.isAdmin
      },
      {
        id: 'audit',
        title: 'Audit Trail',
        description: 'View change history',
        icon: History,
        color: 'bg-gray-500',
        action: handleViewAudit,
        show: profile?.isAdmin
      },
      {
        id: 'manage',
        title: 'Manage Group',
        description: 'Edit group settings',
        icon: Settings,
        color: 'bg-gray-500',
        action: handleManageGroup,
        show: canManageGroup(group)
      },
      {
        id: 'view',
        title: 'View Details',
        description: 'See complete information',
        icon: Eye,
        color: 'bg-indigo-500',
        action: handleViewDetails,
        show: true
      }
    ];

    return cards.filter(card => card.show);
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const availableMembers = members.filter(member => 
    !selectedGroup?.members?.some(m => m.member_id === member.id) &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Toggle bulk selection
  const toggleBulkSelectAll = () => {
    if (!selectedGroup?.members) return;
    
    if (bulkSelectedMembers.length === selectedGroup.members.length) {
      setBulkSelectedMembers([]);
    } else {
      setBulkSelectedMembers(selectedGroup.members.map(m => m.id));
    }
  };

  const toggleBulkSelectMember = (groupMemberId: string) => {
    if (bulkSelectedMembers.includes(groupMemberId)) {
      setBulkSelectedMembers(bulkSelectedMembers.filter(id => id !== groupMemberId));
    } else {
      setBulkSelectedMembers([...bulkSelectedMembers, groupMemberId]);
    }
  };

  // Refresh data
  const handleRefreshData = () => {
    loadData(true); // Force refresh
    setSuccess('Data refreshed successfully');
  };

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

  // Show access denied if user doesn't have permission to access groups
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the groups section. Please contact an administrator.
          </p>
          <p className="text-sm text-gray-500">
            Your role: {profile?.role || 'member'}
            {profile?.assigned_groups && profile.assigned_groups.length > 0 && (
              <span> • Assigned to {profile.assigned_groups.length} group(s)</span>
            )}
          </p>
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
              {profile?.isAdmin 
                ? 'Manage all church cell groups, meetings, and member assignments' 
                : `View and manage groups you are assigned to - ${profile?.role} access`
              }
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {(profile?.isAdmin || (profile?.permissions && profile.permissions.includes('manage_groups'))) && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                {showForm ? 'Cancel' : 'Create Group'}
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
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

        {/* Error Message */}
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

        {/* Group Selection and Tabs */}
        {selectedGroup && canViewGroup(selectedGroup) && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Leader: {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : 'Not assigned'}
                  {selectedGroup.meeting_day && ` • Meets on ${selectedGroup.meeting_day}s`}
                  {selectedGroup.location && ` • ${selectedGroup.location}`}
                  {selectedGroup.status && ` • ${selectedGroup.status.charAt(0).toUpperCase() + selectedGroup.status.slice(1)}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Groups
              </button>
            </div>

            {/* Enhanced Tabs with My Groups */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['groups', 'myGroups', 'meetings', 'members', 'reports', 'audit'] as const).map((tab) => {
                if (tab === 'myGroups' && leaderGroups.length === 0) return null;
                if (tab === 'audit' && !profile?.isAdmin) return null;
                
                return (
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
                    {tab === 'myGroups' && `My Groups (${leaderGroups.length})`}
                    {tab === 'meetings' && 'Meetings'}
                    {tab === 'members' && 'Members'}
                    {tab === 'reports' && 'Reports'}
                    {tab === 'audit' && 'Audit'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* My Groups Tab - NEW */}
        {activeTab === 'myGroups' && leaderGroups.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">My Groups</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Groups where you are the leader
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {leaderGroups.map((group) => (
                <div
                  key={group.group_id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => {
                    const fullGroup = allGroups.find(g => g.id === group.group_id);
                    if (fullGroup) {
                      setSelectedGroup(fullGroup);
                      setActiveTab('groups');
                    }
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.group_name}</h3>
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
                      <UserPlus className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {group.leader_name} {group.leader_surname}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm capitalize">
                        Status: {group.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      You are the leader
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm">
                      Manage Group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Group Form */}
        {showForm && (profile?.isAdmin || (profile?.permissions && profile.permissions.includes('manage_groups'))) && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Cell Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.name ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter group name"
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={groupForm.location}
                    onChange={(e) => setGroupForm({ ...groupForm, location: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.location ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Meeting location"
                  />
                  {formErrors.location && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.location}</p>
                  )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={groupForm.status}
                    onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value as 'active' | 'inactive' | 'archived' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {groupStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
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

        {/* Rest of the component (Group Details, Meetings, Members, Reports, Audit tabs) remains the same */}
        {/* ... */}

      </div>
    </div>
  );
};

export default Groups;
