import { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  Calendar,
  Crown,
  Phone,
  Mail,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Save,
  UserPlus
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  status?: string | null;
  description?: string | null;
  leader?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  } | null;
  member_count?: number;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  status: string;
  cell_group_id: string | null;
}

const CellGroups = () => {
  const { profile } = useAuth();
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CellGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);

  // Check user roles
  const isAdmin = profile?.isAdmin || profile?.role === 'admin';
  const isGroupLeader = profile?.role === 'group_leader' || profile?.role === 'leader';

  // Manual JOIN implementation to match the exact SQL query from the top code
  const fetchCellGroupsForUser = async () => {
    try {
      if (!profile?.name || !profile?.surname) {
        console.log('No user profile name/surname available');
        return [];
      }

      console.log(`Fetching cell groups for user: ${profile.name} ${profile.surname}`);

      // Step 1: Fetch all active cell groups
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (cellGroupsError) throw cellGroupsError;

      console.log('Fetched cell groups:', cellGroupsData);

      // Step 2: Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (membersError) throw membersError;

      console.log('Fetched members:', membersData);

      // Step 3: Manual JOIN - Filter cell groups where leader matches logged-in user
      const userCellGroups = cellGroupsData
        .filter(cellGroup => {
          // Find the leader member for this cell group
          const leader = membersData.find(member => 
            member.id === cellGroup.leader_id &&
            member.name?.toLowerCase() === profile.name?.toLowerCase() &&
            member.surname?.toLowerCase() === profile.surname?.toLowerCase()
          );
          return leader !== undefined; // Only include groups where leader matches
        })
        .map(cellGroup => {
          // Add leader information to the cell group
          const leader = membersData.find(member => member.id === cellGroup.leader_id);
          return {
            ...cellGroup,
            leader: leader ? {
              id: leader.id,
              name: leader.name,
              surname: leader.surname,
              email: leader.email,
              phone: leader.phone
            } : null
          };
        });

      console.log(`Fetched ${userCellGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      console.log('User cell groups:', userCellGroups);

      return userCellGroups as CellGroup[];
    } catch (error) {
      console.error('Error in fetchCellGroupsForUser:', error);
      throw error;
    }
  };

  // Fetch cell groups based on user role
  const fetchCellGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      let userCellGroups: CellGroup[] = [];

      if (isAdmin) {
        // Admin can see all cell groups
        const { data: cellGroupsData, error: cellGroupsError } = await supabase
          .from('cell_groups')
          .select(`
            *,
            leader:members!cell_groups_leader_id_fkey (
              id,
              name,
              surname,
              email,
              phone
            )
          `)
          .order('name');

        if (cellGroupsError) throw cellGroupsError;

        // Get member counts for each group
        const groupsWithCounts = await Promise.all(
          (cellGroupsData || []).map(async (group) => {
            const { count, error: countError } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('cell_group_id', group.id);

            return {
              ...group,
              member_count: countError ? 0 : count || 0
            };
          })
        );

        userCellGroups = groupsWithCounts;
      } else {
        // Regular users only see groups where they are the designated leader (using the exact SQL query logic)
        userCellGroups = await fetchCellGroupsForUser();
        
        // Get member counts for each group
        const groupsWithCounts = await Promise.all(
          userCellGroups.map(async (group) => {
            const { count, error: countError } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .eq('cell_group_id', group.id);

            return {
              ...group,
              member_count: countError ? 0 : count || 0
            };
          })
        );

        userCellGroups = groupsWithCounts;
      }

      setCellGroups(userCellGroups);

      // Fetch all members for the edit modal (admin only)
      if (isAdmin) {
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('*')
          .order('name');

        if (membersError) throw membersError;
        setAllMembers(membersData || []);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load cell groups: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch members for a specific group
  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', groupId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  };

  // Check if user can edit a specific group
  const canEditGroup = (group: CellGroup) => {
    if (isAdmin) return true;
    return false;
  };

  // Handle viewing group details
  const handleViewGroupDetails = async (group: CellGroup) => {
    try {
      const members = await fetchGroupMembers(group.id);
      setSelectedGroup(group);
      setGroupMembers(members);
      setShowGroupDetail(true);
    } catch (error) {
      console.error('Error loading group details:', error);
      setError('Failed to load group details');
    }
  };

  // Handle editing group (admin only)
  const handleEditGroup = async (group: CellGroup) => {
    if (!canEditGroup(group)) return;
    
    setEditingGroup(group);
    
    // Get current group members
    const members = await fetchGroupMembers(group.id);
    setGroupMembers(members);
    
    // Get available members (those not in any group or in this group)
    const available = allMembers.filter(member => 
      !member.cell_group_id || member.cell_group_id === group.id
    );
    setAvailableMembers(available);
    
    setShowEditModal(true);
  };

  // Save group edits (admin only)
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !canEditGroup(editingGroup)) return;

    try {
      const { error } = await supabase
        .from('cell_groups')
        .update({
          name: editingGroup.name,
          location: editingGroup.location,
          meeting_day: editingGroup.meeting_day,
          meeting_time: editingGroup.meeting_time,
          description: editingGroup.description,
          leader_id: editingGroup.leader_id
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      // Refresh data
      await fetchCellGroups();
      setShowEditModal(false);
      setEditingGroup(null);
      setError(null);
    } catch (error: any) {
      console.error('Error updating group:', error);
      setError(`Failed to update group: ${error.message}`);
    }
  };

  // Add member to group (admin only)
  const handleAddMemberToGroup = async (memberId: string) => {
    if (!editingGroup || !canEditGroup(editingGroup)) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: editingGroup.id })
        .eq('id', memberId);

      if (error) throw error;

      // Refresh members list
      const members = await fetchGroupMembers(editingGroup.id);
      setGroupMembers(members);
      
      const available = allMembers.filter(member => 
        !member.cell_group_id || member.cell_group_id === editingGroup.id
      );
      setAvailableMembers(available);

    } catch (error: any) {
      console.error('Error adding member to group:', error);
      setError(`Failed to add member to group: ${error.message}`);
    }
  };

  // Remove member from group (admin only)
  const handleRemoveMemberFromGroup = async (memberId: string) => {
    if (!editingGroup || !canEditGroup(editingGroup)) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);

      if (error) throw error;

      // Refresh members list
      const members = await fetchGroupMembers(editingGroup.id);
      setGroupMembers(members);
      
      const available = allMembers.filter(member => 
        !member.cell_group_id || member.cell_group_id === editingGroup.id
      );
      setAvailableMembers(available);

    } catch (error: any) {
      console.error('Error removing member from group:', error);
      setError(`Failed to remove member from group: ${error.message}`);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchCellGroups();
    }
  }, [profile]);

  // Filter groups based on search term
  const filteredGroups = cellGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.surname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format meeting schedule
  const formatMeetingSchedule = (group: CellGroup) => {
    if (!group.meeting_day && !group.meeting_time) return 'Schedule not set';
    return `${group.meeting_day || 'Day not set'} at ${group.meeting_time || 'Time not set'}`;
  };

  // Get role description
  const getRoleDescription = () => {
    if (isAdmin) return 'Administrative View - Full Access';
    return 'Showing cell groups where you are the designated leader';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading cell groups...</p>
        </div>
      </div>
    );
  }

  if (error && !cellGroups.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchCellGroups}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups for {profile?.name} {profile?.surname}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {getRoleDescription()}
            </p>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              User: {profile?.name} {profile?.surname} | Role: {profile?.role} {isAdmin && '(Admin)'}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCellGroups}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isAdmin && (
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                <Plus className="h-4 w-4" />
                Add Group
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        {cellGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{cellGroups.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cellGroups.reduce((sum, group) => sum + (group.member_count || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Groups</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cellGroups.filter(g => g.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your Role</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {isAdmin ? 'Administrator' : 'Group Leader'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search groups by name, location, or leader..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Filter className="h-4 w-4" />
              <span>{filteredGroups.length} groups found</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? 'All Cell Groups' : 'Your Cell Groups'} ({cellGroups.length} groups found)
            </h2>
          </div>

          {cellGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {isAdmin ? 'No Cell Groups Found' : 'No Cell Groups Found'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                {isAdmin 
                  ? 'There are no cell groups in the system yet.' 
                  : 'No active cell groups found where you are the designated leader.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          group.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {group.status || 'unknown'}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-3 w-3" />
                          {group.member_count || 0} members
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleViewGroupDetails(group)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      {canEditGroup(group) && (
                        <button 
                          onClick={() => handleEditGroup(group)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit Group"
                        >
                          <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {group.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{group.location}</span>
                      </div>
                    )}
                    
                    {(group.meeting_day || group.meeting_time) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{formatMeetingSchedule(group)}</span>
                      </div>
                    )}

                    {group.leader && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <span>Leader: {group.leader.name} {group.leader.surname}</span>
                        {group.leader_id === profile?.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            You
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {group.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewGroupDetails(group)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Detail Modal */}
        {showGroupDetail && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.name} - Group Details
                </h3>
                <button 
                  onClick={() => setShowGroupDetail(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Group Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Group Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedGroup.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {selectedGroup.status || 'unknown'}
                        </span>
                      </div>
                      {selectedGroup.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Location:</span>
                          <span className="text-gray-900 dark:text-white">{selectedGroup.location}</span>
                        </div>
                      )}
                      {(selectedGroup.meeting_day || selectedGroup.meeting_time) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Meeting Schedule:</span>
                          <span className="text-gray-900 dark:text-white">{formatMeetingSchedule(selectedGroup)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Leadership</h4>
                    <div className="space-y-2 text-sm">
                      {selectedGroup.leader ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Leader:</span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedGroup.leader.name} {selectedGroup.leader.surname}
                              {selectedGroup.leader_id === profile?.id && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                          {selectedGroup.leader.email && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Email:</span>
                              <span className="text-gray-900 dark:text-white">{selectedGroup.leader.email}</span>
                            </div>
                          )}
                          {selectedGroup.leader.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                              <span className="text-gray-900 dark:text-white">{selectedGroup.leader.phone}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No leader assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Group Members ({groupMembers.length})
                  </h4>
                  
                  {groupMembers.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="space-y-3">
                        {groupMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                {member.name.charAt(0)}{member.surname.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">
                                  {member.name} {member.surname}
                                </h5>
                                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                  {member.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {member.email}
                                    </span>
                                  )}
                                  {member.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {member.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {member.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No members in this group yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Group Modal (Admin Only) */}
        {showEditModal && editingGroup && isAdmin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Group: {editingGroup.name}
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGroup} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editingGroup.location || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Day
                    </label>
                    <input
                      type="text"
                      value={editingGroup.meeting_day || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, meeting_day: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Monday, Wednesday"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Time
                    </label>
                    <input
                      type="text"
                      value={editingGroup.meeting_time || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, meeting_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 7:00 PM"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingGroup.description || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Group Leader
                    </label>
                    <select
                      value={editingGroup.leader_id || ''}
                      onChange={(e) => setEditingGroup({...editingGroup, leader_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a leader</option>
                      {allMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} {member.surname}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Members Management */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Manage Members ({groupMembers.length} current members)
                  </h4>
                  
                  {/* Current Members */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Current Members</h5>
                    <div className="space-y-2">
                      {groupMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
                          <span>{member.name} {member.surname}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromGroup(member.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {groupMembers.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-2">No members in this group</p>
                      )}
                    </div>
                  </div>

                  {/* Add Members */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Add Members</h5>
                    <div className="space-y-2">
                      {availableMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
                          <span>{member.name} {member.surname}</span>
                          <button
                            type="button"
                            onClick={() => handleAddMemberToGroup(member.id)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                      {availableMembers.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-2">No available members to add</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
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
