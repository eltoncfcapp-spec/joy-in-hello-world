import { Users, Plus, Calendar, User, Search, X, CheckCircle, XCircle, Clock4, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

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
  status?: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  role?: string | null;
  permissions?: string[] | null;
  assigned_groups?: string[] | null;
  assigned_departments?: string[] | null;
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

// Permission utility functions
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const Groups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members'>('groups');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Meeting states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

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
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const [attendanceData, setAttendanceData] = useState<{[key: string]: 'present' | 'absent' | 'late'}>({});
  const [attendanceNotes, setAttendanceNotes] = useState<{[key: string]: string}>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Permission checking for current user
  const currentUserPermissions = profile?.permissions || [];
  const isAdmin = profile?.isAdmin || hasPermission(currentUserPermissions, 'admin_access');
  const canManageGroups = isAdmin || hasPermission(currentUserPermissions, 'manage_groups');
  const canViewGroups = isAdmin || hasPermission(currentUserPermissions, 'view_groups') || canManageGroups;

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Check if user has access to groups
      const userHasAccess = isAdmin || 
        canViewGroups ||
        (profile.assigned_groups && profile.assigned_groups.length > 0) ||
        profile.role === 'group_leader' ||
        profile.is_leader;

      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Load all data
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
      setError('Failed to load groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Fixed fetchGroups function with proper leader filtering
  const fetchGroups = async () => {
    try {
      console.log('Fetching groups for profile:', profile);
      console.log('User role:', profile?.role, 'Is leader:', profile?.is_leader, 'Leader ID:', profile?.id);
      
      let query = supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(
            id,
            name,
            surname
          )
        `)
        .eq('status', 'active');

      // Apply filtering based on user role and permissions
      if (!isAdmin) {
        // If user has assigned groups, filter to only those groups
        if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
          console.log('Filtering by assigned groups:', profile.assigned_groups);
          query = query.in('id', profile.assigned_groups);
        } 
        // If user is a group leader (check both role and is_leader flag), show groups they lead
        else if (profile?.role === 'group_leader' || profile?.is_leader) {
          console.log('Filtering by leader_id for user:', profile.id);
          query = query.eq('leader_id', profile.id);
        }
        // If user is just a member, show their cell group
        else if (profile?.cell_group_id) {
          console.log('Filtering by member cell_group_id:', profile.cell_group_id);
          query = query.eq('id', profile.cell_group_id);
        } else {
          // User has no groups assigned
          console.log('No groups assigned to user');
          setAllGroups([]);
          setGroups([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw groups data:', data);

      const filteredData = data || [];
      setAllGroups(filteredData);
      setGroups(filteredData);

      // Fetch members for each group
      if (filteredData.length > 0) {
        await Promise.all(
          filteredData.map(group => fetchGroupMembers(group.id))
        );
      }

    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
      throw error;
    }
  };

  // Fetch members with permission filtering
  const fetchMembers = async () => {
    try {
      let query = supabase
        .from('members')
        .select('*')
        .order('name');

      // If not admin, filter members based on assigned groups/departments
      if (!isAdmin) {
        if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
          // Filter members who belong to assigned groups
          query = query.in('cell_group_id', profile.assigned_groups);
        } else if (profile?.cell_group_id) {
          // Show only members from user's cell group
          query = query.eq('cell_group_id', profile.cell_group_id);
        } else if (profile?.role === 'group_leader' || profile?.is_leader) {
          // For group leaders, show members from their groups
          const { data: leaderGroups } = await supabase
            .from('cell_groups')
            .select('id')
            .eq('leader_id', profile.id)
            .eq('status', 'active');

          if (leaderGroups && leaderGroups.length > 0) {
            const groupIds = leaderGroups.map(group => group.id);
            query = query.in('cell_group_id', groupIds);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members');
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
      
      setAllGroups(prev => prev.map(group => 
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

  // Check if user can manage specific group
  const canManageGroup = (group: Group) => {
    if (!profile) return false;
    
    // Admin users can manage all groups
    if (isAdmin) return true;

    // Users with manage_groups permission and assigned to this group
    if (canManageGroups && profile.assigned_groups?.includes(group.id)) {
      return true;
    }

    // Group leaders can manage their own groups
    if (group.leader_id === profile.id) {
      return true;
    }

    return false;
  };

  // Check if user can view specific group
  const canViewGroup = (group: Group) => {
    if (!profile) return false;
    
    // Admin users can view all groups
    if (isAdmin) return true;

    // Users with view permission
    if (canViewGroups) return true;

    // Users assigned to this group
    if (profile.assigned_groups?.includes(group.id)) {
      return true;
    }

    // Users who are members of this group
    if (group.members?.some(member => member.id === profile.id)) {
      return true;
    }

    // Group leaders can view their groups
    if (group.leader_id === profile.id) {
      return true;
    }

    return false;
  };

  // Check if user can add members
  const canAddMembers = () => {
    if (!profile) return false;
    return isAdmin || hasPermission(currentUserPermissions, 'add_members') || profile.can_add_members;
  };

  // Check if user can edit members
  const canEditMembers = () => {
    if (!profile) return false;
    return isAdmin || hasPermission(currentUserPermissions, 'edit_members') || profile.can_edit_members;
  };

  // Create new group function
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission
    if (!canManageGroups) {
      setError('You do not have permission to create groups');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!groupForm.name.trim()) {
        setError('Group name is required');
        return;
      }

      // Prepare data for insertion
      const groupData = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        location: groupForm.location.trim() || null,
        leader_id: groupForm.leader_id || null,
        status: 'active'
      };

      console.log('Creating group with data:', groupData);

      const { data, error } = await supabase
        .from('cell_groups')
        .insert([groupData])
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(
            id,
            name,
            surname
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Refresh groups list
      await fetchGroups();
      setShowForm(false);
      setGroupForm({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: '',
        location: '',
        leader_id: ''
      });
      
    } catch (error: any) {
      console.error('Error creating group:', error);
      setError(`Error creating group: ${error.message || 'Please check your data and try again'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add members to group
  const handleAddMembersToGroup = async (groupId: string, memberIds: string[]) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    if (!canAddMembers()) {
      setError('You do not have permission to add members');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: groupId })
        .in('id', memberIds);

      if (error) throw error;

      await fetchGroupMembers(groupId);
      await fetchMembers();
      setSelectedMembers([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error adding members to group:', error);
      setError('Error adding members to group');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from group
  const handleRemoveMemberFromGroup = async (memberId: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    if (!canEditMembers()) {
      setError('You do not have permission to remove members');
      return;
    }

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
    } catch (error) {
      console.error('Error removing member from group:', error);
      setError('Error removing member from group');
    }
  };

  // Meeting management
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage meetings for this group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!meetingForm.meeting_date || !meetingForm.meeting_time || !meetingForm.location) {
        setError('Please fill in all required fields');
        return;
      }

      const { data, error } = await supabase
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
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Error creating meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = async (meeting: Meeting) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to take attendance for this group');
      return;
    }

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
    if (!selectedMeeting || !selectedGroup || !canManageGroup(selectedGroup)) return;

    try {
      setLoading(true);
      setError(null);
      
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

      setShowAttendanceModal(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting || !selectedGroup || !canManageGroup(selectedGroup)) return;

    try {
      setLoading(true);
      setError(null);
      
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
      setError('Error closing meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !selectedGroup || !canManageGroup(selectedGroup)) return;

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('meeting_reports')
        .insert([{
          meeting_id: selectedMeeting.id,
          report_text: reportForm.report_text,
          decisions_made: reportForm.decisions_made,
          action_items: reportForm.action_items,
          next_meeting_date: reportForm.next_meeting_date || null,
          created_by: profile?.id || 'system'
        }]);

      if (error) throw error;

      setShowReportModal(false);
      setReportForm({
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      setError('Error submitting report');
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

  // Filter available members for adding to group
  const availableMembers = members.filter(member => 
    !selectedGroup?.members?.some(m => m.id === member.id) &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
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

  // Show access denied if user doesn't have permission to access groups
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access the groups section. Please contact an administrator.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your role: {profile?.role || 'member'}
            {profile?.assigned_groups && profile.assigned_groups.length > 0 && (
              <span> • Assigned to {profile.assigned_groups.length} group(s)</span>
            )}
            {profile?.is_leader && <span> • Group Leader</span>}
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
              Groups & Ministries
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isAdmin 
                ? 'Manage all church groups, meetings, and member assignments' 
                : `View and manage your assigned groups - ${profile?.role} access`
              }
              {(profile?.role === 'group_leader' || profile?.is_leader) && ' • Group Leader'}
            </p>
          </div>
          {canManageGroups && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Create Group'}
            </button>
          )}
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

        {/* Create Group Form */}
        {showForm && canManageGroups && (
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
        {selectedGroup && canViewGroup(selectedGroup) && (
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
                onClick={() => {
                  setSelectedGroup(null);
                  setActiveTab('groups');
                }}
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
        {selectedGroup && canViewGroup(selectedGroup) && activeTab === 'groups' && (
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
                  {canManageGroup(selectedGroup) && (
                    <>
                      <button
                        onClick={() => {
                          fetchGroupMeetings(selectedGroup.id);
                          setShowMeetingForm(true);
                        }}
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
                    </>
                  )}
                  <button
                    onClick={() => {
                      fetchGroupMeetings(selectedGroup.id);
                      setActiveTab('meetings');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Calendar className="h-4 w-4" />
                    View Meetings
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Meetings</h3>
                <button
                  onClick={() => {
                    fetchGroupMeetings(selectedGroup.id);
                    setActiveTab('meetings');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No meetings scheduled yet</p>
                  {canManageGroup(selectedGroup) && (
                    <button
                      onClick={() => setShowMeetingForm(true)}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Schedule First Meeting
                    </button>
                  )}
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
                          {canManageGroup(selectedGroup) && (
                            <>
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
                            </>
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
        {selectedGroup && canViewGroup(selectedGroup) && activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings</h3>
              {canManageGroup(selectedGroup) && (
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
                </button>
              )}
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No meetings scheduled yet</p>
                {canManageGroup(selectedGroup) && (
                  <button
                    onClick={() => setShowMeetingForm(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Schedule First Meeting
                  </button>
                )}
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
                          {canManageGroup(selectedGroup) && (
                            <>
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
                            </>
                          )}
                          {meeting.status === 'completed' && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm text-center">
                              Completed
                            </span>
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

        {/* Members Management Tab */}
        {selectedGroup && canViewGroup(selectedGroup) && activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Group Members ({selectedGroup.members?.length || 0})
              </h3>
            </div>

            {/* Add Members Section - Only show if user can manage group */}
            {canManageGroup(selectedGroup) && canAddMembers() && (
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
                  {availableMembers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No members found matching your search' : 'No available members to add'}
                    </div>
                  ) : (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-xl max-h-60 overflow-y-auto">
                      {availableMembers.map((member) => (
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
                  )}

                  {selectedMembers.length > 0 && (
                    <button
                      onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Adding Members...' : `Add ${selectedMembers.length} Member${selectedMembers.length > 1 ? 's' : ''} to Group`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Members</h4>
              
              {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No members in this group yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {member.phone || 'No phone'}
                          </div>
                        </div>
                      </div>
                      {canManageGroup(selectedGroup) && canEditMembers() && (
                        <button
                          onClick={() => handleRemoveMemberFromGroup(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove from group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {isAdmin ? 'No Groups Yet' : 'No Groups Available'}
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {isAdmin 
                    ? 'Create your first group to get started' 
                    : 'You are not assigned to any groups or there are no active groups.'
                  }
                </p>
                {canManageGroups && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Create First Group
                  </button>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => {
                    setSelectedGroup(group);
                    fetchGroupMeetings(group.id);
                  }}
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
                    {!canManageGroup(group) && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        View Only
                      </span>
                    )}
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm">
                      {canManageGroup(group) ? 'Manage Group' : 'View Group'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Meeting Form Modal */}
        {showMeetingForm && selectedGroup && canManageGroup(selectedGroup) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule New Meeting</h3>
                <button
                  onClick={() => setShowMeetingForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Date *</label>
                    <input
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time *</label>
                    <input
                      type="time"
                      value={meetingForm.meeting_time}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter meeting topic or agenda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes for the meeting"
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
        {showAttendanceModal && selectedMeeting && selectedGroup && canManageGroup(selectedGroup) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Take Attendance - {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                </h3>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {selectedGroup.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(member.name, member.surname)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.phone || 'No phone'}
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
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
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
        {showReportModal && selectedMeeting && selectedGroup && canManageGroup(selectedGroup) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Report</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Report *</label>
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
                    placeholder="Key decisions made during the meeting..."
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
      </div>
    </div>
  );
};

export default Groups;
