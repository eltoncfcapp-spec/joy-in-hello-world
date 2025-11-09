import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, Mail, Phone } from 'lucide-react';
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
  const [cellGroup, setCellGroup] = useState<CellGroup | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Load user's cell group
  const loadUserCellGroup = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.login_username) {
        setError('User not properly authenticated');
        return;
      }

      console.log('🔍 Loading cell group for user:', profile.login_username);

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
        console.error('Error loading cell group:', queryError);
        
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
          setCellGroup({
            ...fallbackData,
            members: fallbackData.cell_group_members || []
          } as CellGroup);
        } else {
          throw new Error('No cell group found for this user');
        }
      } else {
        setCellGroup({
          ...data,
          members: data.cell_group_members || []
        } as CellGroup);
      }

    } catch (error: any) {
      console.error('Error loading cell group:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all members for adding to group
  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setAllMembers(data || []);
      
      // Filter out members who are already in this cell group
      if (cellGroup) {
        const currentMemberIds = new Set(cellGroup.members?.map(m => m.member_id) || []);
        const available = data?.filter(member => !currentMemberIds.has(member.id)) || [];
        setAvailableMembers(available);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  // Add member to cell group
  const addMemberToGroup = async (memberId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!cellGroup) {
        setError('No cell group selected');
        return;
      }

      const { error } = await supabase
        .from('cell_group_members')
        .insert({
          cell_group_id: cellGroup.id,
          member_id: memberId,
          role: 'member'
        });

      if (error) throw error;

      // Update member's cell_group_id
      const { error: updateError } = await supabase
        .from('members')
        .update({ cell_group_id: cellGroup.id })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error updating member cell_group_id:', updateError);
      }

      setSuccess('Member added to cell group successfully');
      await loadUserCellGroup();
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

      if (!cellGroup) {
        setError('No cell group selected');
        return;
      }

      const { error } = await supabase
        .from('cell_group_members')
        .delete()
        .eq('cell_group_id', cellGroup.id)
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
      await loadUserCellGroup();
      await loadAllMembers();
      
    } catch (error: any) {
      console.error('Error removing member from group:', error);
      setError(`Error removing member: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Update cell group information
  const updateCellGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);

      if (!cellGroup) {
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
        })
        .eq('id', cellGroup.id);

      if (error) throw error;

      setSuccess('Cell group updated successfully');
      await loadUserCellGroup();
      setShowEditModal(false);
      
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Set as leader
  const setAsLeader = async (memberId: string) => {
    try {
      setActionLoading(true);
      setError(null);

      if (!cellGroup) {
        setError('No cell group selected');
        return;
      }

      // Update cell group leader
      const { error } = await supabase
        .from('cell_groups')
        .update({ leader_id: memberId })
        .eq('id', cellGroup.id);

      if (error) throw error;

      // Update member role in cell_group_members
      const { error: memberError } = await supabase
        .from('cell_group_members')
        .update({ role: 'leader' })
        .eq('cell_group_id', cellGroup.id)
        .eq('member_id', memberId);

      if (memberError) {
        console.error('Error updating member role:', memberError);
      }

      setSuccess('Leader assigned successfully');
      await loadUserCellGroup();
      
    } catch (error: any) {
      console.error('Error setting leader:', error);
      setError(`Error setting leader: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize edit form with current data
  const initializeEditForm = () => {
    if (cellGroup) {
      setEditFormData({
        name: cellGroup.name || '',
        description: cellGroup.description || '',
        location: cellGroup.location || '',
        meeting_day: cellGroup.meeting_day || '',
        meeting_time: cellGroup.meeting_time || '',
      });
    }
    setShowEditModal(true);
  };

  // Filter available members based on search
  const filteredAvailableMembers = availableMembers.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (profile) {
      loadUserCellGroup();
    }
  }, [profile]);

  useEffect(() => {
    if (cellGroup) {
      loadAllMembers();
    }
  }, [cellGroup]);

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
          <p className="text-gray-600 dark:text-gray-400">Loading your cell group...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !cellGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Cell Group Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are not assigned to any cell group. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            My Cell Group
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {cellGroup?.leader ? 
              `Led by ${cellGroup.leader.name} ${cellGroup.leader.surname}` : 
              'No leader assigned'
            }
          </p>
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

        {/* Cell Group Card */}
        {cellGroup && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cellGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                      {cellGroup.status || 'Active'}
                    </span>
                  </div>
                </div>
                {cellGroup.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {cellGroup.description}
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  View Members ({cellGroup.members?.length || 0})
                </button>
                {profile?.is_leader && (
                  <>
                    <button
                      onClick={initializeEditForm}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Group
                    </button>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Member
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Group Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Location */}
              {cellGroup.location && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.location}</p>
                  </div>
                </div>
              )}

              {/* Meeting Day */}
              {cellGroup.meeting_day && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Day</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.meeting_day}</p>
                  </div>
                </div>
              )}

              {/* Meeting Time */}
              {cellGroup.meeting_time && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cellGroup.meeting_time}</p>
                  </div>
                </div>
              )}

              {/* Member Count */}
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Members</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cellGroup.current_member_count || cellGroup.members?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Leader Info */}
            {cellGroup.leader && (
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Group Leader</h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {cellGroup.leader.name?.[0]}{cellGroup.leader.surname?.[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {cellGroup.leader.name} {cellGroup.leader.surname}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {cellGroup.leader.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="h-3 w-3" />
                          {cellGroup.leader.email}
                        </div>
                      )}
                      {cellGroup.leader.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="h-3 w-3" />
                          {cellGroup.leader.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                    <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Leader</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditModal && cellGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
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
        {showAddMemberModal && cellGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Member to Group</h3>
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
              <div className="max-h-96 overflow-y-auto">
                {filteredAvailableMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No available members found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
        {showMembersModal && cellGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Group Members ({cellGroup.members?.length || 0})
                </h3>
                <button onClick={() => setShowMembersModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Members List */}
              <div className="space-y-3">
                {cellGroup.members?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No members in this group yet</p>
                  </div>
                ) : (
                  cellGroup.members?.map(member => (
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
                      {profile?.is_leader && member.role !== 'leader' && (
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
                  ))
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
