import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, Mail, Phone, Eye } from 'lucide-react';
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
  description?: string | null;
  current_member_count?: number | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string | null;
  leader?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  } | null;
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
    status?: string;
  };
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role?: string | null;
  cell_group_id?: string | null;
  is_leader?: boolean | null;
  status?: string;
}

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
  });

  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Check if user is group_leader and can manage all groups
  const isGroupLeader = profile?.role === 'group_leader' || profile?.is_leader === true;
  const canManageAllGroups = isGroupLeader;

  // Load ALL cell groups for group_leader, or user's group for regular users
  const loadCellGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile) {
        setError('User not properly authenticated');
        return;
      }

      console.log('🔍 Loading cell groups for user:', {
        role: profile.role,
        isGroupLeader: isGroupLeader,
        is_leader: profile.is_leader,
        login_username: profile.login_username
      });

      if (canManageAllGroups) {
        // Load ALL cell groups for group_leader
        console.log('👑 Group Leader - loading ALL cell groups');
        const { data, error: queryError } = await supabase
          .from('cell_groups')
          .select(`
            *,
            leader:members!leader_id(id, name, surname, email, phone),
            cell_group_members(
              *,
              member:members(id, name, surname, email, phone, status)
            )
          `)
          .order('name');

        if (queryError) {
          throw new Error(`Error loading cell groups: ${queryError.message}`);
        }

        const groupsWithMembers = (data || []).map(group => ({
          ...group,
          members: group.cell_group_members || []
        })) as CellGroup[];

        console.log('📋 All cell groups loaded:', groupsWithMembers.length);
        setCellGroups(groupsWithMembers);
      } else {
        // Load only user's cell group for non-leader users
        console.log('👤 Regular user - loading user cell group');
        const { data, error: queryError } = await supabase
          .from('cell_groups')
          .select(`
            *,
            leader:members!leader_id(id, name, surname, email, phone),
            cell_group_members(
              *,
              member:members(id, name, surname, email, phone, status)
            )
          `)
          .eq('members.login_username', profile.login_username)
          .single();

        if (queryError) {
          console.error('Error loading user cell group:', queryError);
          
          // Fallback: Try to get cell group via cell_group_id
          if (profile.cell_group_id) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('cell_groups')
              .select(`
                *,
                leader:members!leader_id(id, name, surname, email, phone),
                cell_group_members(
                  *,
                  member:members(id, name, surname, email, phone, status)
                )
              `)
              .eq('id', profile.cell_group_id)
              .single();

            if (fallbackError) {
              throw new Error('No cell group found for this user');
            }
            setCellGroups([{
              ...fallbackData,
              members: fallbackData.cell_group_members || []
            } as CellGroup]);
          } else {
            throw new Error('No cell group found for this user');
          }
        } else {
          setCellGroups([{
            ...data,
            members: data.cell_group_members || []
          } as CellGroup]);
        }
      }

    } catch (error: any) {
      console.error('Error loading cell groups:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all members for adding to groups
  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setAllMembers(data || []);
      
      // Filter available members for the selected group
      if (selectedGroup) {
        const currentMemberIds = new Set(selectedGroup.members?.map(m => m.member_id) || []);
        const available = data?.filter(member => !currentMemberIds.has(member.id)) || [];
        setAvailableMembers(available);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  // Create new cell group
  const createCellGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);

      if (!createFormData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      const { data, error } = await supabase
        .from('cell_groups')
        .insert({
          name: createFormData.name.trim(),
          description: createFormData.description.trim() || null,
          location: createFormData.location.trim() || null,
          meeting_day: createFormData.meeting_day || null,
          meeting_time: createFormData.meeting_time || null,
          leader_id: createFormData.leader_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add leader to group members if specified
      if (createFormData.leader_id && data) {
        const { error: memberError } = await supabase
          .from('cell_group_members')
          .insert({
            cell_group_id: data.id,
            member_id: createFormData.leader_id,
            role: 'leader'
          });

        if (memberError) {
          console.error('Error adding leader to group:', memberError);
        }

        // Also update the member's cell_group_id
        const { error: updateError } = await supabase
          .from('members')
          .update({ cell_group_id: data.id })
          .eq('id', createFormData.leader_id);

        if (updateError) {
          console.error('Error updating leader cell_group_id:', updateError);
        }
      }

      setSuccess('Cell group created successfully');
      await loadCellGroups();
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        description: '',
        location: '',
        meeting_day: '',
        meeting_time: '',
        leader_id: '',
      });
      
    } catch (error: any) {
      console.error('Error creating cell group:', error);
      setError(`Error creating cell group: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Update cell group
  const updateCellGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);

      if (!selectedGroup) {
        setError('No cell group selected');
        return;
      }

      const { error } = await supabase
        .from('cell_groups')
        .update({
          name: editFormData.name.trim(),
          description: editFormData.description.trim() || null,
          location: editFormData.location.trim() || null,
          meeting_day: editFormData.meeting_day || null,
          meeting_time: editFormData.meeting_time || null,
          leader_id: editFormData.leader_id || null,
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      // Update leader in group members if changed
      if (editFormData.leader_id && selectedGroup.leader_id !== editFormData.leader_id) {
        // Remove previous leader role
        if (selectedGroup.leader_id) {
          await supabase
            .from('cell_group_members')
            .update({ role: 'member' })
            .eq('cell_group_id', selectedGroup.id)
            .eq('member_id', selectedGroup.leader_id);
        }

        // Add new leader
        const { error: memberError } = await supabase
          .from('cell_group_members')
          .upsert({
            cell_group_id: selectedGroup.id,
            member_id: editFormData.leader_id,
            role: 'leader'
          }, {
            onConflict: 'cell_group_id,member_id'
          });

        if (memberError) {
          console.error('Error updating leader:', memberError);
        }

        // Update new leader's cell_group_id
        const { error: updateError } = await supabase
          .from('members')
          .update({ cell_group_id: selectedGroup.id })
          .eq('id', editFormData.leader_id);

        if (updateError) {
          console.error('Error updating leader cell_group_id:', updateError);
        }
      }

      setSuccess('Cell group updated successfully');
      await loadCellGroups();
      setShowEditModal(false);
      setSelectedGroup(null);
      
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Add member to cell group
  const addMemberToGroup = async (memberId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!selectedGroup) {
        setError('No cell group selected');
        return;
      }

      const { error } = await supabase
        .from('cell_group_members')
        .insert({
          cell_group_id: selectedGroup.id,
          member_id: memberId,
          role: 'member'
        });

      if (error) throw error;

      // Update member's cell_group_id
      const { error: updateError } = await supabase
        .from('members')
        .update({ cell_group_id: selectedGroup.id })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error updating member cell_group_id:', updateError);
      }

      setSuccess('Member added to cell group successfully');
      await loadCellGroups();
      await loadAllMembers();
      setShowAddMemberModal(false);
      
    } catch (error: any) {
      console.error('Error adding member to group:', error);
      setError(`Error adding member: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Remove member from cell group
  const removeMemberFromGroup = async (memberId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!selectedGroup) {
        setError('No cell group selected');
        return;
      }

      const { error } = await supabase
        .from('cell_group_members')
        .delete()
        .eq('cell_group_id', selectedGroup.id)
        .eq('member_id', memberId);

      if (error) throw error;

      // Clear member's cell_group_id
      const { error: updateError } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error clearing member cell_group_id:', updateError);
      }

      setSuccess('Member removed from cell group successfully');
      await loadCellGroups();
      await loadAllMembers();
      
    } catch (error: any) {
      console.error('Error removing member from group:', error);
      setError(`Error removing member: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Set as leader
  const setAsLeader = async (memberId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!selectedGroup) {
        setError('No cell group selected');
        return;
      }

      // Update cell group leader
      const { error } = await supabase
        .from('cell_groups')
        .update({ leader_id: memberId })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      // Update member role in cell_group_members
      const { error: memberError } = await supabase
        .from('cell_group_members')
        .update({ role: 'leader' })
        .eq('cell_group_id', selectedGroup.id)
        .eq('member_id', memberId);

      if (memberError) {
        console.error('Error updating member role:', memberError);
      }

      // Update member's cell_group_id
      const { error: updateError } = await supabase
        .from('members')
        .update({ cell_group_id: selectedGroup.id })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error updating leader cell_group_id:', updateError);
      }

      setSuccess('Leader assigned successfully');
      await loadCellGroups();
      
    } catch (error: any) {
      console.error('Error setting leader:', error);
      setError(`Error setting leader: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete cell group
  const deleteCellGroup = async (groupId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!confirm('Are you sure you want to delete this cell group? This action cannot be undone.')) {
        return;
      }

      // First, remove all members from the group
      const { error: membersError } = await supabase
        .from('cell_group_members')
        .delete()
        .eq('cell_group_id', groupId);

      if (membersError) {
        console.error('Error removing group members:', membersError);
      }

      // Then delete the cell group
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      setSuccess('Cell group deleted successfully');
      await loadCellGroups();
      
    } catch (error: any) {
      console.error('Error deleting cell group:', error);
      setError(`Error deleting cell group: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize edit form with current data
  const initializeEditForm = (group: CellGroup) => {
    setSelectedGroup(group);
    setEditFormData({
      name: group.name || '',
      description: group.description || '',
      location: group.location || '',
      meeting_day: group.meeting_day || '',
      meeting_time: group.meeting_time || '',
      leader_id: group.leader_id || '',
    });
    setShowEditModal(true);
  };

  // Open add member modal
  const openAddMemberModal = (group: CellGroup) => {
    setSelectedGroup(group);
    setShowAddMemberModal(true);
  };

  // Open members modal
  const openMembersModal = (group: CellGroup) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  // Filter available members based on search
  const filteredAvailableMembers = availableMembers.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (profile) {
      loadCellGroups();
      loadAllMembers();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedGroup) {
      loadAllMembers();
    }
  }, [selectedGroup]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {canManageAllGroups ? 'Loading all cell groups...' : 'Loading your cell group...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {canManageAllGroups 
                ? `Group Leader access - managing ${cellGroups.length} cell groups` 
                : `Viewing your cell group - ${profile?.role} access`
              }
            </p>
            {canManageAllGroups && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                You have full access to manage all cell groups and members
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canManageAllGroups && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
              >
                <Plus className="h-5 w-5" />
                Create Cell Group
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Cell Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cellGroups.map((group) => (
            <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              {/* Group Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-800 dark:text-green-200 text-xs font-medium">
                        {group.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Group Details */}
              <div className="space-y-3 mb-4">
                {group.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{group.location}</span>
                  </div>
                )}
                
                {(group.meeting_day || group.meeting_time) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>{group.members?.length || 0} members</span>
                </div>

                {group.leader && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Leader: {group.leader.name} {group.leader.surname}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => openMembersModal(group)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex-1 justify-center"
                >
                  <Eye className="h-3 w-3" />
                  View Members
                </button>
                
                {canManageAllGroups && (
                  <>
                    <button
                      onClick={() => initializeEditForm(group)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex-1 justify-center"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => openAddMemberModal(group)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex-1 justify-center"
                    >
                      <Plus className="h-3 w-3" />
                      Add Member
                    </button>
                    <button
                      onClick={() => deleteCellGroup(group.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex-1 justify-center disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {cellGroups.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Cell Groups Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {canManageAllGroups 
                ? "Get started by creating your first cell group." 
                : "You are not assigned to any cell group yet."
              }
            </p>
            {canManageAllGroups && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium mx-auto"
              >
                <Plus className="h-5 w-5" />
                Create Your First Cell Group
              </button>
            )}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Cell Group</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={createCellGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter group name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter group description (optional)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={createFormData.location}
                    onChange={(e) => setCreateFormData({...createFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter meeting location (optional)"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meeting Day
                    </label>
                    <select
                      value={createFormData.meeting_day}
                      onChange={(e) => setCreateFormData({...createFormData, meeting_day: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meeting Time
                    </label>
                    <input
                      type="time"
                      value={createFormData.meeting_time}
                      onChange={(e) => setCreateFormData({...createFormData, meeting_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Leader (Optional)
                  </label>
                  <select
                    value={createFormData.leader_id}
                    onChange={(e) => setCreateFormData({...createFormData, leader_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select leader</option>
                    {allMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Cell Group</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={updateCellGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meeting Day
                    </label>
                    <select
                      value={editFormData.meeting_day}
                      onChange={(e) => setEditFormData({...editFormData, meeting_day: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meeting Time
                    </label>
                    <input
                      type="time"
                      value={editFormData.meeting_time}
                      onChange={(e) => setEditFormData({...editFormData, meeting_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Leader
                  </label>
                  <select
                    value={editFormData.leader_id}
                    onChange={(e) => setEditFormData({...editFormData, leader_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select leader</option>
                    {allMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Update Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Member to {selectedGroup.name}
                </h3>
                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search members by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              {/* Available Members List */}
              <div className="flex-1 overflow-y-auto">
                {filteredAvailableMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No available members found</p>
                    {searchTerm && (
                      <p className="text-sm mt-2">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {member.name?.[0]}{member.surname?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.name} {member.surname}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => addMemberToGroup(member.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members Modal */}
        {showMembersModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.name} - Members ({selectedGroup.members?.length || 0})
                </h3>
                <button onClick={() => setShowMembersModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Members List */}
              <div className="flex-1 overflow-y-auto">
                {selectedGroup.members?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No members in this group yet</p>
                    {canManageAllGroups && (
                      <button
                        onClick={() => openAddMemberModal(selectedGroup)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Members
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedGroup.members?.map(member => (
                      <div
                        key={member.member_id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {member.member?.name?.[0]}{member.member?.surname?.[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {member.member?.name} {member.member?.surname}
                              </p>
                              {member.role === 'leader' && (
                                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                                  <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Leader</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                              {member.member?.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {member.member.email}
                                </div>
                              )}
                              {member.member?.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {member.member.phone}
                                </div>
                              )}
                              {member.member?.status && (
                                <div className={`px-2 py-1 rounded text-xs ${
                                  member.member.status === 'active' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {member.member.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Member Actions */}
                        {canManageAllGroups && member.role !== 'leader' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAsLeader(member.member_id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Make Leader
                            </button>
                            <button
                              onClick={() => removeMemberFromGroup(member.member_id)}
                              disabled={actionLoading}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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
