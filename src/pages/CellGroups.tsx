import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle } from 'lucide-react';
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
  created_at?: string;
  updated_at?: string | null;
  members?: CellGroupMember[];
}

interface CellGroupMember {
  id: string;
  cell_group_id: string;
  member_id: string;
  role: 'leader' | 'member' | 'assistant';
  assigned_at: string;
  member?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
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
}

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

// Check if user is admin or pastor
const isAdminOrPastor = (role: string): boolean => {
  return role === 'admin' || role === 'pastor';
};

// Check if user can manage all groups (has manage_groups permission)
const canManageAllGroups = (permissions: string[] = []): boolean => {
  return hasPermission(permissions, 'manage_groups');
};

const CellGroups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [allCellGroups, setAllCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Check if user can create cell groups (only Admin)
  const canCreateGroups = () => {
    if (!profile) return false;
    return isAdminOrPastor(profile.role);
  };

  // Check if user can manage specific cell group
  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can manage all groups
    if (isAdminOrPastor(profile.role)) {
      return true;
    }
    
    // Users with manage_groups permission can manage all groups
    if (canManageAllGroups(profile.permissions)) {
      return true;
    }
    
    // Group leaders can only manage their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase()
      );
    }
    
    // Check if user is the leader of this group (from leader_id)
    if (group.leader_id === profile.id) {
      return true;
    }

    // Check if user is marked as leader in cell_group_members
    const isGroupLeader = group.members?.some(member => 
      member.member_id === profile.id && member.role === 'leader'
    );
    if (isGroupLeader) return true;

    return false;
  };

  // Check if user can view specific cell group
  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can view all groups
    if (isAdminOrPastor(profile.role)) {
      return true;
    }
    
    // Users with view_groups or manage_groups permission can view all groups
    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      return true;
    }
    
    // Group leaders can view their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase()
      );
    }
    
    // Regular members can only view groups they are members of
    if (profile.role === 'member') {
      // Check if member belongs to this group via cell_group_members
      const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
      
      // Or check if their cell_group_id matches this group
      const isMemberByCellGroupId = profile.cell_group_id === group.id;
      
      return isMemberOfGroup || isMemberByCellGroupId || false;
    }
    
    return false;
  };

  // Filter cell groups based on user permissions
  const getFilteredCellGroups = () => {
    if (!profile) return [];

    // Admin and Pastor can see all cell groups
    if (isAdminOrPastor(profile.role)) {
      return allCellGroups;
    }

    // Users with view_groups or manage_groups permission can see all groups
    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      return allCellGroups;
    }

    let userGroups: CellGroup[] = [];

    // Group leaders can see their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups && profile.assigned_groups.length > 0) {
      userGroups = allCellGroups.filter(group => 
        profile.assigned_groups?.some(assignedGroup => 
          assignedGroup.toLowerCase() === group.name.toLowerCase()
        )
      );
    }

    // Regular members can see groups they are members of
    if (profile.role === 'member') {
      const memberGroups = allCellGroups.filter(group => {
        // Check via cell_group_members table
        const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
        
        // Check via cell_group_id field
        const isMemberByCellGroupId = profile.cell_group_id === group.id;
        
        return isMemberOfGroup || isMemberByCellGroupId;
      });
      userGroups = [...userGroups, ...memberGroups];
    }

    // Remove duplicates
    const uniqueGroups = userGroups.filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    );

    return uniqueGroups;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCellGroups(),
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

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!leader_id(id, name, surname, email, phone),
          cell_group_members(
            *,
            member:members(id, name, surname, email, phone)
          )
        `)
        .order('name');

      if (error) throw error;
      
      const cellGroupsData = data || [];
      
      // Map the data properly
      const mappedGroups = cellGroupsData.map(group => ({
        ...group,
        members: group.cell_group_members || []
      }));
      
      setAllCellGroups(mappedGroups as CellGroup[]);
      
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

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('cell_group_members')
        .select(`
          *,
          member:members(id, name, surname, email, phone)
        `)
        .eq('cell_group_id', groupId)
        .order('role', { ascending: false });

      if (error) throw error;
      
      setAllCellGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, members: data || [] } : group
      ));
    } catch (error) {
      console.error('Error fetching group members:', error);
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

      // Determine access based on role and permissions
      let userHasAccess = false;

      // Admin and Pastor always have access
      if (isAdminOrPastor(profile.role)) {
        userHasAccess = true;
      }
      // Users with view_groups or manage_groups permission
      else if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
        userHasAccess = true;
      }
      // Group leaders with assigned groups
      else if (profile.role === 'group_leader' && profile.assigned_groups && profile.assigned_groups.length > 0) {
        userHasAccess = true;
      }
      // Regular members who belong to a cell group
      else if (profile.role === 'member' && profile.cell_group_id) {
        userHasAccess = true;
      }
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Update filtered cell groups when allCellGroups or profile changes
  useEffect(() => {
    if (allCellGroups.length > 0 && profile) {
      const filtered = getFilteredCellGroups();
      setCellGroups(filtered);
    }
  }, [allCellGroups, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission - only admin/pastor can create groups
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups. Only administrators can create new cell groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!formData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      const { data, error } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          meeting_day: formData.meeting_day || null,
          meeting_time: formData.meeting_time || null,
          leader_id: formData.leader_id || null,
        })
        .select();

      if (error) throw error;

      // If leader was assigned, add them to cell_group_members as leader
      if (formData.leader_id && data && data[0]) {
        const { error: memberError } = await supabase
          .from('cell_group_members')
          .insert({
            cell_group_id: data[0].id,
            member_id: formData.leader_id,
            role: 'leader'
          });

        if (memberError) {
          console.error('Error adding leader to group members:', memberError);
        }
      }

      await fetchCellGroups();
      setShowForm(false);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
    } catch (error: any) {
      console.error('Error creating cell group:', error);
      setError(`Error creating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
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

      // Update leader in cell_group_members if changed
      if (formData.leader_id && selectedGroup.leader_id !== formData.leader_id) {
        // Remove previous leader role
        if (selectedGroup.leader_id) {
          await supabase
            .from('cell_group_members')
            .update({ role: 'member' })
            .eq('cell_group_id', selectedGroup.id)
            .eq('member_id', selectedGroup.leader_id);
        }

        // Add new leader role
        const { error: memberError } = await supabase
          .from('cell_group_members')
          .upsert({
            cell_group_id: selectedGroup.id,
            member_id: formData.leader_id,
            role: 'leader'
          }, {
            onConflict: 'cell_group_id,member_id'
          });

        if (memberError) {
          console.error('Error updating leader in group members:', memberError);
        }
      }

      await fetchCellGroups();
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
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const groupToDelete = allCellGroups.find(g => g.id === groupId);
    if (!groupToDelete || !canManageGroup(groupToDelete)) {
      setError('You do not have permission to delete this cell group');
      return;
    }

    if (!confirm('Are you sure you want to delete this cell group? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First delete related records in cell_group_members
      const { error: membersError } = await supabase
        .from('cell_group_members')
        .delete()
        .eq('cell_group_id', groupId);

      if (membersError) throw membersError;

      // Then delete the cell group
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await fetchCellGroups();
    } catch (error: any) {
      console.error('Error deleting cell group:', error);
      setError(`Error deleting cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembersToGroup = async (groupId: string, memberIds: string[], role: string = 'member') => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this cell group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add members to cell_group_members table
      const membersToAdd = memberIds.map(memberId => ({
        cell_group_id: groupId,
        member_id: memberId,
        role: role as 'leader' | 'member' | 'assistant'
      }));

      const { error } = await supabase
        .from('cell_group_members')
        .insert(membersToAdd);

      if (error) throw error;

      await fetchGroupMembers(groupId);
      await fetchMembers();
      setSelectedMembers([]);
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error adding members to cell group:', error);
      setError(`Error adding members to cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMemberFromGroup = async (groupMemberId: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this cell group');
      return;
    }

    try {
      const { error } = await supabase
        .from('cell_group_members')
        .delete()
        .eq('id', groupMemberId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
      }
    } catch (error: any) {
      console.error('Error removing member from cell group:', error);
      setError(`Error removing member from cell group: ${error.message}`);
    }
  };

  const handleUpdateMemberRole = async (groupMemberId: string, newRole: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this cell group');
      return;
    }

    try {
      const { error } = await supabase
        .from('cell_group_members')
        .update({ role: newRole })
        .eq('id', groupMemberId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchGroupMembers(selectedGroup.id);
      }
    } catch (error: any) {
      console.error('Error updating member role:', error);
      setError(`Error updating member role: ${error.message}`);
    }
  };

  const openEditForm = (group: CellGroup) => {
    if (!canManageGroup(group)) {
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

  const openMembersModal = (group: CellGroup) => {
    if (!canViewGroup(group)) {
      setError('You do not have permission to view this cell group');
      return;
    }

    setSelectedGroup(group);
    setShowMembersModal(true);
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
          {profile?.role === 'member' && !profile?.cell_group_id && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You are not assigned to any cell group. Please contact an administrator.
            </p>
          )}
          {profile?.role === 'group_leader' && (!profile?.assigned_groups || profile.assigned_groups.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You don't have any assigned groups to manage. Please contact an administrator.
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
              {isAdminOrPastor(profile?.role || '')
                ? 'Full administrative access to all cell groups' 
                : canManageAllGroups(profile?.permissions)
                ? 'Can manage all cell groups and members'
                : profile?.role === 'group_leader'
                ? `Managing ${profile?.assigned_groups?.length || 0} assigned group(s)`
                : `Viewing your cell group - ${profile?.role} access`
              }
            </p>
            {!isAdminOrPastor(profile?.role || '') && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {canManageAllGroups(profile?.permissions)
                  ? 'You have full access to manage all cell groups'
                  : profile?.role === 'group_leader' 
                  ? 'You can only view and manage cell groups assigned to you'
                  : 'You can only view the cell group you belong to'
                }
              </p>
            )}
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
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
                    placeholder="Meeting location"
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cell group description and purpose"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader (Optional)</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
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

        {/* Cell Groups List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && cellGroups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cell groups...</p>
            </div>
          ) : cellGroups.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {isAdminOrPastor(profile?.role || '') ? 'No Cell Groups Yet' : 'No Access to Cell Groups'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {isAdminOrPastor(profile?.role || '')
                  ? 'Create your first cell group to get started' 
                  : canManageAllGroups(profile?.permissions)
                  ? 'No cell groups available'
                  : profile?.role === 'group_leader'
                  ? 'You are not assigned to any cell groups as a leader'
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
            cellGroups.map((group) => {
              const canManage = canManageGroup(group);
              const canView = canViewGroup(group);
              
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
                      {group.location && (
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-2 ml-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {group.location}
                        </span>
                      )}
                      {group.meeting_day && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                      {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openMembersModal(group)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Members
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => openEditForm(group)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Edit group"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete group"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Edit Cell Group Modal */}
        {showEditForm && selectedGroup && canManageGroup(selectedGroup) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Cell Group</h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateGroup} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader</label>
                    <select
                      value={formData.leader_id}
                      onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
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
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Updating...' : 'Update Cell Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Members Management Modal */}
        {showMembersModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.name} - Members ({selectedGroup.members?.length || 0})
                </h3>
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedMembers([]);
                    setSearchTerm('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Add Members Section - Only show if user can manage group */}
              {canManageGroup(selectedGroup) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
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
                                {member.email || 'No email'} • {member.phone || 'No phone'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedMembers.length > 0 && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers, 'member')}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Add as Member ({selectedMembers.length})
                        </button>
                        <button
                          onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers, 'assistant')}
                          disabled={loading}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          Add as Assistant
                        </button>
                        <button
                          onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers, 'leader')}
                          disabled={loading}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                        >
                          Add as Leader
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Current Members */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Current Members {!canManageGroup(selectedGroup) && '(Read Only)'}
                </h4>
                
                {!selectedGroup.members || selectedGroup.members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No members in this group yet</p>
                    {canManageGroup(selectedGroup) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Use the search above to add members to this group
                      </p>
                    )}
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
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : groupMember.role === 'assistant'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {groupMember.role}
                          </span>
                          
                          {/* Only show management controls if user can manage the group */}
                          {canManageGroup(selectedGroup) && (
                            <>
                              <select
                                value={groupMember.role}
                                onChange={(e) => handleUpdateMemberRole(groupMember.id, e.target.value)}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="member">Member</option>
                                <option value="leader">Leader</option>
                                <option value="assistant">Assistant</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMemberFromGroup(groupMember.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remove from group"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CellGroups;
