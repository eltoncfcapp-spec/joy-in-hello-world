import { Users, Plus, Calendar, UserPlus, FileText, BarChart3, Settings, Eye, MapPin, Clock, CheckCircle, AlertCircle, Building, ChevronDown, Search, Phone, Mail, X } from 'lucide-react';
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
}

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [allGroups, setAllGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members'>('groups');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Meeting states
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const memberRoles = ['member', 'leader', 'assistant'];

  // Permission check functions using auth context
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

  // Filter groups based on user permissions
  const getFilteredGroups = () => {
    if (!profile) return [];

    // Admin and users with view_all_groups can see all groups
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

  // Update filtered groups when allGroups or profile changes
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
      setError('Failed to load groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

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
      
      // Apply filtering based on user permissions
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
      
      // Also update selectedGroup if it's the current one
      if (selectedGroup && selectedGroup.id === groupId) {
        setSelectedGroup(prev => prev ? { ...prev, members: data || [] } : null);
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const fetchGroupMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  // Load meetings when group is selected and meetings tab is active
  useEffect(() => {
    if (selectedGroup && activeTab === 'meetings') {
      fetchGroupMeetings(selectedGroup.id);
    }
  }, [selectedGroup, activeTab]);

  // Load members when group is selected and members tab is active
  useEffect(() => {
    if (selectedGroup && activeTab === 'members') {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup, activeTab]);

  // Create new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission using auth context
    if (!canCreateGroups()) {
      setError('You do not have permission to create groups. Only administrators and users with manage_all_groups permission can create new groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!groupForm.name.trim()) {
        setError('Group name is required');
        return;
      }

      const groupData = {
        name: groupForm.name.trim(),
        location: groupForm.location.trim() || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        leader_id: groupForm.leader_id || null
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

      // Refresh groups list
      await fetchGroups();
      setShowForm(false);
      setGroupForm({
        name: '',
        location: '',
        meeting_day: '',
        meeting_time: '',
        leader_id: ''
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

  // Add members to group
  const handleAddMembersToGroup = async (groupId: string, memberIds: string[], role: string = 'member') => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
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

      await fetchGroupMembers(groupId);
      await fetchMembers();
      setSelectedMembers([]);
      setSearchTerm('');
      setSuccess(`${memberIds.length} member(s) added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding members to group:', error);
      setError(`Error adding members to group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove member from group
  const handleRemoveMemberFromGroup = async (groupMemberId: string) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', groupMemberId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
        setSuccess('Member removed successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error removing member from group:', error);
      setError(`Error removing member from group: ${error.message}`);
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (groupMemberId: string, newRole: string) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group');
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', groupMemberId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
        setSuccess('Member role updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error updating member role:', error);
      setError(`Error updating member role: ${error.message}`);
    }
  };

  // Meeting management
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage meetings for this group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!meetingForm.meeting_date || !meetingForm.meeting_time || !meetingForm.location) {
        setError('Please fill in all required fields');
        return;
      }

      const { data, error } = await supabase
        .from('group_meetings')
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
      setSuccess('Meeting scheduled successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(`Error creating meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update meeting status
  const handleUpdateMeetingStatus = async (meetingId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage meetings for this group');
      return;
    }

    try {
      const { error } = await supabase
        .from('group_meetings')
        .update({ status: newStatus })
        .eq('id', meetingId);

      if (error) throw error;

      // Refresh meetings
      await fetchGroupMeetings(selectedGroup.id);
      setSuccess(`Meeting marked as ${newStatus}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating meeting status:', error);
      setError(`Error updating meeting status: ${error.message}`);
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage meetings for this group');
      return;
    }

    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('group_meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;

      // Refresh meetings
      await fetchGroupMeetings(selectedGroup.id);
      setSuccess('Meeting deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      setError(`Error deleting meeting: ${error.message}`);
    }
  };

  // Action handlers for the action cards
  const handleAddReport = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`Add Report for ${group.name}\n\nThis would open a form to submit meeting minutes and attendance.`);
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
    alert(`View Analytics for ${group.name}\n\nThis would show group statistics and growth metrics.`);
  };

  const handleManageGroup = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('groups');
  };

  const handleViewDetails = (group: CellGroup) => {
    setSelectedGroup(group);
    setActiveTab('groups');
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
        show: checkCanManageGroup(group)
      },
      {
        id: 'members',
        title: 'Add Members',
        description: 'Manage group members',
        icon: UserPlus,
        color: 'bg-green-500',
        action: handleAddMembers,
        show: checkCanManageGroup(group)
      },
      {
        id: 'event',
        title: 'Create Event',
        description: 'Schedule new events',
        icon: Calendar,
        color: 'bg-purple-500',
        action: handleCreateEvent,
        show: checkCanManageGroup(group)
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'See group statistics',
        icon: BarChart3,
        color: 'bg-orange-500',
        action: handleViewAnalytics,
        show: checkCanManageGroup(group) || profile?.role === 'admin'
      },
      {
        id: 'manage',
        title: 'Manage Group',
        description: 'Edit group settings',
        icon: Settings,
        color: 'bg-gray-500',
        action: handleManageGroup,
        show: checkCanManageGroup(group)
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
            You don't have permission to access the groups section.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your role: {profile?.role || 'member'}
          </p>
          {profile?.assigned_groups && profile.assigned_groups.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Assigned groups: {profile.assigned_groups.join(', ')}
            </p>
          )}
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

        {/* Create Group Form */}
        {showForm && canCreateGroups() && (
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
        {selectedGroup && checkCanViewGroup(selectedGroup) && (
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
        {selectedGroup && checkCanViewGroup(selectedGroup) && activeTab === 'groups' && (
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
                  {checkCanManageGroup(selectedGroup) && (
                    <>
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
                    </>
                  )}
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Calendar className="h-4 w-4" />
                    View Meetings
                  </button>
                </div>

                {/* Action Cards Grid */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {getActionCards(selectedGroup).map((card) => {
                      const IconComponent = card.icon;
                      return (
                        <button
                          key={card.id}
                          onClick={() => card.action(selectedGroup)}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                          title={card.description}
                        >
                          <div className={`p-1 rounded ${card.color} text-white`}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {card.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meetings Tab */}
        {selectedGroup && checkCanViewGroup(selectedGroup) && activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings</h3>
              {checkCanManageGroup(selectedGroup) && (
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
                {checkCanManageGroup(selectedGroup) && (
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
                {meetings.map((meeting) => (
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
                        {meeting.notes && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{meeting.notes}</p>
                          </div>
                        )}
                      </div>
                      {checkCanManageGroup(selectedGroup) && (
                        <div className="flex flex-col gap-2">
                          {meeting.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleUpdateMeetingStatus(meeting.id, 'completed')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                Mark Complete
                              </button>
                              <button
                                onClick={() => handleUpdateMeetingStatus(meeting.id, 'cancelled')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Management Tab */}
        {selectedGroup && checkCanViewGroup(selectedGroup) && activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Group Members ({selectedGroup.members?.length || 0})
              </h3>
            </div>

            {/* Add Members Section - Only show if user can manage group */}
            {checkCanManageGroup(selectedGroup) && (
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
                    <div className="flex gap-3">
                      <select
                        onChange={(e) => {
                          const role = e.target.value;
                          handleAddMembersToGroup(selectedGroup.id, selectedMembers, role);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="member">Add as Member</option>
                        <option value="leader">Add as Leader</option>
                        <option value="assistant">Add as Assistant</option>
                      </select>
                    </div>
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
                  {selectedGroup.members.map((groupMember) => (
                    <div key={groupMember.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(groupMember.member?.name || '', groupMember.member?.surname || '')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {groupMember.member?.name} {groupMember.member?.surname}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {groupMember.member?.phone || 'No phone'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          groupMember.role === 'leader' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : groupMember.role === 'assistant'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {groupMember.role}
                        </span>
                        {checkCanManageGroup(selectedGroup) && (
                          <>
                            <select
                              value={groupMember.role}
                              onChange={(e) => handleUpdateMemberRole(groupMember.id, e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {memberRoles.map(role => (
                                <option key={role} value={role}>
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveMemberFromGroup(groupMember.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove from group"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
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
                  {canViewAllGroups() ? 'No Groups Yet' : 'No Access to Groups'}
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {canViewAllGroups()
                    ? 'Create your first group to get started' 
                    : 'You are not a member of any groups'
                  }
                </p>
                {canCreateGroups() && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Create First Group
                  </button>
                )}
              </div>
            ) : (
              groups.map((group) => {
                const canManage = checkCanManageGroup(group);
                const canView = checkCanViewGroup(group);
                
                return (
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
                        {canManage ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium mb-2">
                            Can Manage
                          </span>
                        ) : canView ? (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium mb-2">
                            View Only
                          </span>
                        ) : null}
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
                          Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {group.members?.length || 0} members
                      </span>
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm">
                        {canManage ? 'Manage Group' : 'View Group'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Meeting Form Modal */}
        {showMeetingForm && selectedGroup && checkCanManageGroup(selectedGroup) && (
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
      </div>
    </div>
  );
};

export default Groups;
