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
  X
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Interface for the SQL query result - matching your exact query
interface UserCellGroupQueryResult {
  group_id: string;
  group_name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  status: string;
  leader_name: string;
  leader_surname: string;
  leader_id: string;
}

// Extended interface for group details with members
interface GroupMember {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  status: string;
  joined_date: string;
}

interface GroupDetails extends UserCellGroupQueryResult {
  members?: GroupMember[];
  member_count?: number;
  description?: string | null;
}

const Groups = () => {
  const { profile } = useAuth();
  const [userCellGroups, setUserCellGroups] = useState<GroupDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Execute the EXACT SQL query with name and surname filter
  const fetchUserCellGroups = async (): Promise<GroupDetails[]> => {
    try {
      if (!profile?.id || !profile?.name || !profile?.surname) {
        console.log('No user profile name/surname available');
        return [];
      }

      console.log(`Executing SQL query for user: ${profile.name} ${profile.surname}, ID: ${profile.id}`);

      // Get all active cell groups
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (cellGroupsError) {
        console.error('Error fetching cell groups:', cellGroupsError);
        throw new Error(`Failed to fetch cell groups: ${cellGroupsError.message}`);
      }

      // Get all members to filter by name and surname
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw new Error(`Failed to fetch members: ${membersError.message}`);
      }

      console.log('Fetched cell groups:', cellGroupsData);
      console.log('Fetched members:', membersData);

      // Manual JOIN implementation to match the exact SQL query with name/surname filter
      const userGroups: GroupDetails[] = [];

      cellGroupsData.forEach(cellGroup => {
        // Find the leader member for this cell group
        const leader = membersData.find(member => 
          member.id === cellGroup.leader_id &&
          member.name?.toLowerCase() === profile.name?.toLowerCase() &&
          member.surname?.toLowerCase() === profile.surname?.toLowerCase()
        );

        // Only include groups where leader matches the current user's name and surname
        if (leader) {
          userGroups.push({
            group_id: cellGroup.id,
            group_name: cellGroup.name,
            location: cellGroup.location,
            meeting_day: cellGroup.meeting_day,
            meeting_time: cellGroup.meeting_time,
            status: cellGroup.status || 'active',
            leader_name: leader.name,
            leader_surname: leader.surname,
            leader_id: cellGroup.leader_id || '',
            description: cellGroup.description,
            member_count: 0 // Will be updated later
          });
        }
      });

      console.log(`Found ${userGroups.length} cell groups for user: ${profile.name} ${profile.surname}`);
      
      // Debug: Show what groups were found
      userGroups.forEach(group => {
        console.log(`Group: ${group.group_name}, Leader: ${group.leader_name} ${group.leader_surname}, Leader ID: ${group.leader_id}`);
      });

      return userGroups;
    } catch (error) {
      console.error('Error fetching user cell groups:', error);
      throw error;
    }
  };

  // Fetch members for a specific group
  const fetchGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    try {
      const { data: membersData, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', groupId)
        .order('name');

      if (error) {
        console.error('Error fetching group members:', error);
        return [];
      }

      return (membersData || []).map(member => ({
        id: member.id,
        name: member.name,
        surname: member.surname,
        email: member.email,
        phone: member.phone,
        status: member.status || 'active',
        joined_date: member.created_at || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  };

  // Fetch member counts for all groups
  const fetchMemberCounts = async (groups: GroupDetails[]): Promise<GroupDetails[]> => {
    try {
      const groupsWithCounts = await Promise.all(
        groups.map(async (group) => {
          const { count, error } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.group_id);

          if (error) {
            console.error(`Error counting members for group ${group.group_name}:`, error);
            return { ...group, member_count: 0 };
          }

          return { ...group, member_count: count || 0 };
        })
      );

      return groupsWithCounts;
    } catch (error) {
      console.error('Error fetching member counts:', error);
      return groups;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting data load...');
      const queryResults = await fetchUserCellGroups();
      console.log('Query results:', queryResults);
      
      // Fetch member counts for each group
      const groupsWithCounts = await fetchMemberCounts(queryResults);
      
      setUserCellGroups(groupsWithCounts);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load cell groups data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroupDetails = async (group: GroupDetails) => {
    try {
      setMembersLoading(true);
      const members = await fetchGroupMembers(group.group_id);
      const groupWithMembers = { ...group, members };
      setSelectedGroup(groupWithMembers);
      setShowGroupDetail(true);
    } catch (error) {
      console.error('Error loading group details:', error);
      setError('Failed to load group details');
    } finally {
      setMembersLoading(false);
    }
  };

  const closeGroupDetail = () => {
    setShowGroupDetail(false);
    setSelectedGroup(null);
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  // Filter groups based on search term
  const filteredGroups = userCellGroups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.meeting_day?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate the EXACT SQL query with name and surname filter
  const getSqlQuery = () => {
    if (!profile?.name || !profile?.surname) return '';
    
    return `SELECT 
  cg.id AS group_id, 
  cg.name AS group_name, 
  cg.location, 
  cg.meeting_day, 
  cg.meeting_time, 
  cg.status, 
  m.name AS leader_name, 
  m.surname AS leader_surname 
FROM public.cell_groups cg 
JOIN public.members m ON cg.leader_id = m.id 
WHERE cg.status = 'active' 
  AND LOWER(m.name) = '${profile.name?.toLowerCase()}'
  AND LOWER(m.surname) = '${profile.surname?.toLowerCase()}';`;
  };

  // Format meeting schedule
  const formatMeetingSchedule = (group: GroupDetails) => {
    if (!group.meeting_day && !group.meeting_time) return 'Schedule not set';
    return `${group.meeting_day || 'Day not set'} at ${group.meeting_time || 'Time not set'}`;
  };

  // Show loading state while query is executing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading cell groups...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Executing SQL query with name/surname filter...</p>
        </div>
      </div>
    );
  }

  // Show error state if query failed
  if (error && !userCellGroups.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadData}
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
              My Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Showing cell groups where you are the designated leader
            </p>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-500 flex items-center gap-4">
              <span>User: {profile?.name} {profile?.surname}</span>
              <span>ID: {profile?.id}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {userCellGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userCellGroups.length}</p>
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
                    {userCellGroups.reduce((sum, group) => sum + (group.member_count || 0), 0)}
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
                    {userCellGroups.filter(g => g.status === 'active').length}
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
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Group Leader</p>
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
                placeholder="Search groups by name, location, or meeting day..."
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

        {/* Query Information */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">SQL Query Being Executed:</h2>
          <code className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm block overflow-x-auto">
            {getSqlQuery()}
          </code>
        </div>

        {/* Results */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              My Cell Groups ({userCellGroups.length} groups found)
            </h2>
          </div>

          {userCellGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Cell Groups Found</h3>
              <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                No active cell groups found where you ({profile?.name} {profile?.surname}) are the designated leader.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div
                  key={group.group_id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {group.group_name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          group.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {group.status}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-3 w-3" />
                          {group.member_count || 0} members
                        </span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
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

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span>Leader: {group.leader_name} {group.leader_surname}</span>
                      {group.leader_id === profile?.id && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          You
                        </span>
                      )}
                    </div>
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
                  {selectedGroup.group_name} - Group Details
                </h3>
                <button 
                  onClick={closeGroupDetail}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {membersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading group members...</p>
                  </div>
                ) : (
                  <>
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
                              {selectedGroup.status}
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
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Leader:</span>
                            <span className="text-gray-900 dark:text-white">
                              {selectedGroup.leader_name} {selectedGroup.leader_surname}
                              {selectedGroup.leader_id === profile?.id && (
                                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Leader ID:</span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs">
                              {selectedGroup.leader_id}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Group ID:</span>
                            <span className="text-gray-900 dark:text-white font-mono text-xs">
                              {selectedGroup.group_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Members List */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Group Members ({selectedGroup.members?.length || 0})
                      </h4>
                      
                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                          <div className="space-y-3">
                            {selectedGroup.members.map((member) => (
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Raw Data Display for Debugging */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Raw Query Results</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto max-h-96">
            {JSON.stringify(userCellGroups, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Groups;
