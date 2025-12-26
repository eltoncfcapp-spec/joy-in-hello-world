import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Settings, Trash2, Edit } from 'lucide-react';

// Interfaces (keep all your interfaces as they are)
interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
  created_at?: string;
  updated_at?: string;
  leader_name?: string | null;
  leader_residence?: string | null;
  leader_phone?: string | null;
  is_current_user_leader?: boolean;
}

interface GroupMeeting {
  id: string;
  group_id: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  cancellation_reason?: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id?: string | null;
  status?: string | null;
  admin_role?: string | null;
  invited_by?: string | null;
}

interface GroupAttendanceRecord {
  id: string;
  meeting_id: string | null;
  member_id: string | null;
  status: 'present' | 'absent' | 'absent_with_reason' | string | null;
  notes?: string | null;
  members?: Member | null;
}

interface GroupReport {
  id: string;
  meeting_id: string | null;
  report_text: string | null;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_at: string | null;
}

// Create Group Modal (keep all your existing modal components as they are)
const CreateGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string | null;
}> = ({ isOpen, onClose, onSuccess, onError, userId }) => {
  // ... keep all your existing CreateGroupModal code ...
  return (/* your existing JSX */);
};

// Edit Group Modal (keep as is)
const EditGroupModal: React.FC<{
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  canEdit: boolean;
}> = ({ isOpen, group, onClose, onSuccess, onError, canEdit }) => {
  // ... keep all your existing EditGroupModal code ...
  return (/* your existing JSX */);
};

// Delete Group Modal (keep as is)
const DeleteGroupModal: React.FC<{
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onConfirm: () => void;
  onError: (message: string) => void;
  canDelete: boolean;
}> = ({ isOpen, group, onClose, onConfirm, onError, canDelete }) => {
  // ... keep all your existing DeleteGroupModal code ...
  return (/* your existing JSX */);
};

// Group Meeting Creation Step Component (keep as is)
const GroupMeetingCreationStep = ({ group, onMeetingCreated, onError }: { 
  group: CellGroup; 
  onMeetingCreated: () => void; 
  onError: (message: string) => void; 
}) => {
  // ... keep all your existing GroupMeetingCreationStep code ...
  return (/* your existing JSX */);
};

// Group Attendance Step Component (keep as is)
const GroupAttendanceStep: React.FC<GroupAttendanceStepProps> = ({ group, meetings, selectedMeeting, onMeetingSelect, onAttendanceSaved, onError }) => {
  // ... keep all your existing GroupAttendanceStep code ...
  return (/* your existing JSX */);
};

// Group Newcomer Step Component (keep as is)
const GroupNewcomerStep: React.FC<GroupNewcomerStepProps> = ({ group, selectedMeeting, onNewcomerAdded, onError }) => {
  // ... keep all your existing GroupNewcomerStep code ...
  return (/* your existing JSX */);
};

// Group Report Step Component (keep as is)
const GroupReportStep: React.FC<GroupReportStepProps> = ({ group, meetings, selectedMeeting, onMeetingSelect, onReportCreated, onError }) => {
  // ... keep all your existing GroupReportStep code ...
  return (/* your existing JSX */);
};

// Group Management Workflow Component (keep as is)
const GroupManagementWorkflow: React.FC<GroupWorkflowProps> = ({ group, meetings, members: _members, onClose, onSuccess, onError }) => {
  // ... keep all your existing GroupManagementWorkflow code ...
  return (/* your existing JSX */);
};

// Main Groups Component - FIXED VERSION
const Groups = () => {
  const { 
    profile, 
    canViewGroup, 
    canManageGroup, 
    getRoles, 
    isAdmin, 
    isPastor,
    isDeacon,
    isGroupLeader,
    isDepartmentLeader
  } = useAuth();
  
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<GroupMeeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<GroupAttendanceRecord[]>([]);

  // Get user's current group ID from profile
  const userGroupId = profile?.cell_group_id || null;

  // Safely get user roles and check permissions
  const userRoles = getRoles ? getRoles() : [];
  const isUserAdmin = isAdmin ? isAdmin() : false;
  const isUserPastor = isPastor ? isPastor() : false;
  const isUserDeacon = isDeacon ? isDeacon() : false;
  const isUserGroupLeader = isGroupLeader ? isGroupLeader() : false;
  const isUserDepartmentLeader = isDepartmentLeader ? isDepartmentLeader() : false;
  
  // Determine if user is a regular member (not admin, pastor, deacon, or group leader)
  const isUserMember = !isUserAdmin && !isUserPastor && !isUserDeacon && !isUserGroupLeader && !isUserDepartmentLeader;

  useEffect(() => {
    if (profile) {
      loadGroups();
      loadAllMembers();
    }
  }, [profile]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      
      // First, load all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Get leader information for each group
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);
          
          // Get leader information if leader_id exists
          let leaderInfo = null;
          if (group.leader_id) {
            const { data: leaderData } = await supabase
              .from('members')
              .select('name, surname, residence, phone')
              .eq('id', group.leader_id)
              .single();
            
            leaderInfo = leaderData;
          }
          
          // Check if current user is the leader of this group
          const isCurrentUserLeader = group.leader_id === profile?.id;
          
          return {
            ...group,
            leader_name: leaderInfo ? `${leaderInfo.name} ${leaderInfo.surname}` : null,
            leader_residence: leaderInfo?.residence || null,
            leader_phone: leaderInfo?.phone || null,
            memberCount: count || 0,
            is_current_user_leader: isCurrentUserLeader
          };
        })
      );

      // DEBUG: Log user information
      console.log('User Debug Info:', {
        userId: profile?.id,
        userGroupId: userGroupId,
        isUserAdmin,
        isUserPastor,
        isUserDeacon,
        isUserGroupLeader,
        isUserMember,
        adminRole: profile?.admin_role,
        allGroupsCount: groupsWithDetails.length
      });

      // Filter groups based on user role - FIXED LOGIC
      let filteredGroups = groupsWithDetails;
      
      // First check if user is admin or pastor (full access)
      if (isUserAdmin || isUserPastor) {
        // Admins and Pastors see all groups
        console.log('User is Admin/Pastor - showing all groups');
      } 
      // Then check if user is a Group Leader
      else if (isUserGroupLeader) {
        console.log('User is Group Leader - filtering groups by leadership');
        // Group Leaders can see only groups they lead
        filteredGroups = groupsWithDetails.filter(group => {
          const isLeader = group.leader_id === profile?.id;
          console.log(`Checking group ${group.name}: leader_id=${group.leader_id}, user_id=${profile?.id}, isLeader=${isLeader}`);
          return isLeader;
        });
        console.log('Filtered groups for Group Leader:', filteredGroups.map(g => g.name));
      }
      // Then check if user is a Deacon or Department Leader
      else if (isUserDeacon || isUserDepartmentLeader) {
        console.log('User is Deacon/Department Leader - showing all groups');
        // Deacons and Department Leaders see all groups
        filteredGroups = groupsWithDetails;
      }
      // Then check if user is a regular Member
      else if (isUserMember) {
        console.log('User is Member - filtering by assigned group');
        // Members can see only their own assigned group
        if (userGroupId) {
          filteredGroups = groupsWithDetails.filter(group => group.id === userGroupId);
          console.log('Member group filter:', filteredGroups.map(g => g.name));
        } else {
          filteredGroups = []; // Member has no group assigned
          console.log('Member has no group assigned');
        }
      }
      // No role - no access
      else {
        console.log('User has no recognized role - showing no groups');
        filteredGroups = [];
      }

      setGroups(filteredGroups);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getUserGroup = async (): Promise<CellGroup | null> => {
    try {
      if (!profile?.id) return null;
      
      // First check if user is a leader of any group
      const { data: leaderGroup } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('leader_id', profile.id)
        .single();
      
      if (leaderGroup) return leaderGroup;
      
      // If not a leader, check assigned group
      const { data: memberData } = await supabase
        .from('members')
        .select('cell_group_id')
        .eq('id', profile.id)
        .single();
      
      if (!memberData?.cell_group_id) return null;
      
      const { data: groupData } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('id', memberData.cell_group_id)
        .single();
      
      return groupData;
    } catch (error) {
      console.error('Failed to get user group:', error);
      return null;
    }
  };

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  };

  const loadMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      setError('Failed to load meetings: ' + error.message);
    }
  };

  const loadAttendanceForMeeting = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          members:member_id (
            id, name, surname, residence, phone
          )
        `)
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Error loading attendance:', error);
        setError('Failed to load attendance: ' + error.message);
        return;
      }
      
      console.log('Loaded attendance records:', data);
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      setError('Failed to load attendance: ' + error.message);
    }
  };

  const openReportModal = async (meeting: GroupMeeting) => {
    setSelectedMeetingForReport(meeting);
    await loadAttendanceForMeeting(meeting.id);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const openMeetingsModal = async (group: CellGroup) => {
    // Use the correct permission check
    if (!checkCanViewGroup(group.id)) {
      setError('You do not have permission to view this group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
    await loadMeetings(group.id);
  };

  const openWorkflowModal = async (group: CellGroup) => {
    // Check if user can manage this specific group
    const canManage = checkCanManageGroup(group.id);
    
    if (!canManage) {
      setError('You do not have permission to manage this group');
      return;
    }

    setSelectedGroup(group);
    setShowWorkflowModal(true);
    await loadMeetings(group.id);
  };

  const openEditGroupModal = (group: CellGroup) => {
    // Only allow admin and pastor to edit groups
    if (!isUserAdmin && !isUserPastor) {
      setError('Only administrators and pastors can edit groups');
      return;
    }
    setSelectedGroup(group);
    setShowEditGroupModal(true);
  };

  const openDeleteGroupModal = (group: CellGroup) => {
    // Only allow admin and pastor to delete groups
    if (!isUserAdmin && !isUserPastor) {
      setError('Only administrators and pastors can delete groups');
      return;
    }
    setSelectedGroup(group);
    setShowDeleteGroupModal(true);
  };

  const closeAllModals = () => {
    setShowCreateGroupModal(false);
    setShowEditGroupModal(false);
    setShowDeleteGroupModal(false);
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setShowReportModal(false);
    setSelectedGroup(null);
    setSelectedMeetingForReport(null);
    setAttendanceRecords([]);
  };

  const handleGroupCreated = () => {
    loadGroups();
    setSuccess('Group created successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGroupUpdated = () => {
    loadGroups();
    setSuccess('Group updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGroupDeleted = () => {
    loadGroups();
    setSuccess('Group deleted successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Permission functions - FIXED VERSION
  const canCreateGroups = () => {
    return isUserAdmin || isUserPastor;
  };

  const canEditGroup = (group: CellGroup) => {
    // Only admin and pastor can edit groups
    return isUserAdmin || isUserPastor;
  };

  const canDeleteGroup = (group: CellGroup) => {
    // Only admin and pastor can delete groups
    return isUserAdmin || isUserPastor;
  };

  // FIXED: Check if user can manage a specific group
  const checkCanManageGroup = (groupId: string) => {
    if (isUserAdmin || isUserPastor) {
      return true; // Admins & Pastors can manage all groups
    }
    
    // For group leaders, check if they lead this specific group
    if (isUserGroupLeader) {
      const group = groups.find(g => g.id === groupId);
      const isLeader = group?.leader_id === profile?.id;
      console.log(`checkCanManageGroup - groupId: ${groupId}, isLeader: ${isLeader}`);
      return isLeader;
    }
    
    return false;
  };

  // FIXED: Check if user can view a specific group
  const checkCanViewGroup = (groupId: string) => {
    if (isUserAdmin || isUserPastor || isUserDeacon || isUserDepartmentLeader) {
      return true; // Admins, Pastors, Deacons & Department Leaders can view all
    }
    
    // For group leaders, check if they lead this specific group
    if (isUserGroupLeader) {
      const group = groups.find(g => g.id === groupId);
      const isLeader = group?.leader_id === profile?.id;
      console.log(`checkCanViewGroup for Group Leader - groupId: ${groupId}, isLeader: ${isLeader}`);
      return isLeader;
    }
    
    // For members, check if this is their assigned group
    if (isUserMember) {
      const isMemberGroup = groupId === userGroupId;
      console.log(`checkCanViewGroup for Member - groupId: ${groupId}, userGroupId: ${userGroupId}, isMemberGroup: ${isMemberGroup}`);
      return isMemberGroup;
    }
    
    return false;
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const absentWithReason = attendanceRecords.filter(r => r.status === 'absent_with_reason').length;
    const total = attendanceRecords.length;

    return { attended, absent, absentWithReason, total };
  };

  // Helper function to get user role display
  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    if (isUserAdmin) return 'Administrator';
    if (isUserPastor) return 'Pastor';
    if (isUserDeacon) return 'Deacon';
    if (isUserDepartmentLeader) return 'Department Leader';
    if (isUserGroupLeader) return 'Group Leader';
    if (isUserMember) return 'Member';
    return 'Guest';
  };

  // Render the main component
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Church Cell Groups</h1>
          <p className="text-lg text-gray-600">
            {profile ? `Logged in as ${getUserRoleDisplay()} (ID: ${profile?.id})` : 'Please log in to view groups'}
          </p>
          {profile && isUserGroupLeader && (
            <p className="text-sm text-blue-600 mt-2">
              You are a Group Leader. You can only see and manage groups you lead.
            </p>
          )}
        </div>

        {/* Search and Create Group Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {canCreateGroups() && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Create New Group
            </button>
          )}
        </div>

        {/* Error/Success Messages */}
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

        {/* Groups Grid */}
        {!profile ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Please Log In</h3>
            <p className="text-gray-500 mb-6">You need to be logged in to view groups</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No groups match your search' : 'No Accessible Groups'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Try a different search term' : 
                   isUserGroupLeader ? 'You are not assigned as a leader of any group' :
                   isUserMember ? 'You are not assigned to any group' :
                   'You do not have access to any groups'}
                </p>
                {canCreateGroups() && (
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    Create Your First Group
                  </button>
                )}
              </div>
            ) : (
              groups.filter(group => 
                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.leader_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((group) => {
                // Use the corrected permission check functions
                const canManage = checkCanManageGroup(group.id);
                const canView = checkCanViewGroup(group.id);
                const canEdit = canEditGroup(group);
                const canDelete = canDeleteGroup(group);
                
                return (
                  <div
                    key={group.id}
                    className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
                          <Users className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {group.is_current_user_leader && (
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                Your Leadership
                              </span>
                            )}
                            {canManage ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                Can Manage
                              </span>
                            ) : canView ? (
                              <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                View Only
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEditGroupModal(group)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Group"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => openDeleteGroupModal(group)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      {group.leader_name && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Leader: {group.leader_name}</span>
                        </div>
                      )}
                      {group.location && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{group.location}</span>
                        </div>
                      )}
                      {(group.meeting_day || group.meeting_time) && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                          </span>
                        </div>
                      )}
                      {group.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">
                        {group.memberCount || 0} member{(group.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(group)}
                          disabled={!canView}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          View Meetings
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openWorkflowModal(group)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Manage Group
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modals - Keep all your existing modal JSX here */}
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onSuccess={handleGroupCreated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          userId={profile?.id || null}
        />
        
        <EditGroupModal
          isOpen={showEditGroupModal}
          group={selectedGroup}
          onClose={() => setShowEditGroupModal(false)}
          onSuccess={handleGroupUpdated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canEdit={selectedGroup ? canEditGroup(selectedGroup) : false}
        />

        <DeleteGroupModal
          isOpen={showDeleteGroupModal}
          group={selectedGroup}
          onClose={() => setShowDeleteGroupModal(false)}
          onConfirm={handleGroupDeleted}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canDelete={selectedGroup ? canDeleteGroup(selectedGroup) : false}
        />

        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* ... rest of your meetings modal JSX ... */}
            </div>
          </div>
        )}

        {showReportModal && selectedMeetingForReport && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
              {/* ... rest of your report modal JSX ... */}
            </div>
          </div>
        )}

        {showWorkflowModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* ... rest of your workflow modal JSX ... */}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:max-h-none {
            max-height: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Groups;
