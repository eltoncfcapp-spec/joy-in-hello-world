import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Settings, Trash2, Edit } from 'lucide-react';

// Interfaces (same as before)
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

// New Group Creation Component (same as before)
// ... [Keep the CreateGroupModal component as is] ...

// Edit Group Modal Component (same as before)
// ... [Keep the EditGroupModal component as is] ...

// Delete Group Confirmation Modal (same as before)
// ... [Keep the DeleteGroupModal component as is] ...

// Group Meeting Creation Step (same as before)
// ... [Keep the GroupMeetingCreationStep component as is] ...

// Group Attendance Step Component (same as before)
// ... [Keep the GroupAttendanceStep component as is] ...

// Group Newcomer Step Component (same as before)
// ... [Keep the GroupNewcomerStep component as is] ...

// Group Report Step Component (same as before)
// ... [Keep the GroupReportStep component as is] ...

// Group Management Workflow Component
interface GroupWorkflowProps {
  group: CellGroup;
  meetings: GroupMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const GroupManagementWorkflow: React.FC<GroupWorkflowProps> = ({ group, meetings, members: _members, onClose, onSuccess, onError }) => {
  const { profile, canCreateGroupMeetings, canManageGroupAttendance, canAddGroupNewcomers, canCreateGroupReports } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<GroupMeeting | null>(null);

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;

    switch (stepNumber) {
      case 1:
        return canCreateGroupMeetings(group.id);
      case 2:
        return canManageGroupAttendance(group.id);
      case 3:
        return canAddGroupNewcomers(group.id);
      case 4:
        return canCreateGroupReports(group.id);
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {steps.map((step) => (
          <div key={step.number} className="flex-1 text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
              currentStep >= step.number 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {step.number}
            </div>
            <div className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
            <div className="text-xs text-gray-400 hidden md:block">{step.description}</div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-50 rounded-xl p-6 min-h-[400px]">
        {currentStep === 1 && (
          <GroupMeetingCreationStep
            group={group}
            onMeetingCreated={() => {
              onSuccess('Group meeting created successfully!');
              setCurrentStep(2);
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <GroupAttendanceStep
            group={group}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onAttendanceSaved={() => {
              onSuccess('Group attendance saved successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
          />
        )}

        {currentStep === 3 && (
          <GroupNewcomerStep
            group={group}
            selectedMeeting={selectedMeeting}
            onNewcomerAdded={() => {
              onSuccess('Newcomer added successfully!');
              setCurrentStep(4);
            }}
            onError={onError}
          />
        )}

        {currentStep === 4 && (
          <GroupReportStep
            group={group}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onReportCreated={() => {
              onSuccess('Group report generated successfully!');
              onClose();
            }}
            onError={onError}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
        >
          Previous
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Close
          </button>
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={currentStep === 4 || !canAccessStep(currentStep + 1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Groups Component - UPDATED PERMISSIONS
const Groups = () => {
  const { profile, canViewGroup, canManageGroup, getRoles, isAdministrator, isPastor, isGroupLeader, isDeacon, isMember } = useAuth();
  
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

      // Filter groups based on user role - UPDATED PERMISSIONS
      let filteredGroups = groupsWithDetails;
      
      if (!isAdministrator && !isPastor && !isDeacon) {
        if (isGroupLeader) {
          // Group Leaders can see only their own group
          filteredGroups = groupsWithDetails.filter(group => 
            group.leader_id === profile?.id
          );
        } else if (isMember) {
          // MEMBERS SHOULD NOT HAVE ACCESS - return empty array
          filteredGroups = [];
        }
      }
      // Administrators, Pastors, and Deacons can see all groups
      // Deacons can only view (handled in permission functions)

      setGroups(filteredGroups);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserGroup = async (): Promise<CellGroup | null> => {
    try {
      if (!profile?.id) return null;
      
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
      
      console.log('Loaded attendance records:', data); // Debug log
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
    if (!canViewGroup(group.id)) {
      setError('You do not have permission to view this group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
    await loadMeetings(group.id);
  };

  const openWorkflowModal = async (group: CellGroup) => {
    if (!canManageGroup(group.id)) {
      setError('You do not have permission to manage this group');
      return;
    }

    setSelectedGroup(group);
    setShowWorkflowModal(true);
    await loadMeetings(group.id);
  };

  const openEditGroupModal = (group: CellGroup) => {
    if (!canEditGroup(group)) {
      setError('You do not have permission to edit this group');
      return;
    }
    setSelectedGroup(group);
    setShowEditGroupModal(true);
  };

  const openDeleteGroupModal = (group: CellGroup) => {
    if (!canDeleteGroup(group)) {
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

  // UPDATED PERMISSION FUNCTIONS
  const canCreateGroups = () => {
    return isAdministrator || isPastor; // Only Admin & Pastors can create
  };

  const canEditGroup = (group: CellGroup) => {
    if (isAdministrator || isPastor) {
      return true; // Admins & Pastors can edit all groups
    }
    if (isGroupLeader) {
      return group.leader_id === profile?.id; // Leaders can edit only their own group
    }
    // Deacons and Members cannot edit any groups
    return false;
  };

  const canDeleteGroup = (group: CellGroup) => {
    return isAdministrator || isPastor; // Only admins & pastors can delete
  };

  const canViewGroupDetails = (group: CellGroup) => {
    if (isAdministrator || isPastor || isDeacon) {
      return true; // Admins, Pastors & Deacons can view all groups
    }
    if (isGroupLeader) {
      return group.leader_id === profile?.id; // Leaders can view only their own group
    }
    // Members cannot view any groups
    return false;
  };

  // Check if user can see action buttons (edit/delete)
  const canSeeActionButtons = (group: CellGroup) => {
    // Deacons can only view, so they shouldn't see action buttons
    if (isDeacon) return false;
    
    return canEditGroup(group) || canDeleteGroup(group);
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const roles = getRoles();
    if (roles.includes('admin') || roles.includes('administrator')) return 'Administrator';
    if (roles.includes('pastor')) return 'Pastor';
    if (roles.includes('deacon')) return 'Deacon (View Only)';
    if (roles.includes('group_leader')) return 'Group Leader';
    if (roles.includes('member')) return 'Member';
    return 'Guest';
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const absentWithReason = attendanceRecords.filter(r => r.status === 'absent_with_reason').length;
    const total = attendanceRecords.length;

    return { attended, absent, absentWithReason, total };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Church Cell Groups</h1>
          <p className="text-lg text-gray-600">
            {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view groups'}
          </p>
          {/* Permission Info Banner */}
          {profile && (
            <div className="mt-4 max-w-2xl mx-auto">
              {isMember && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-red-700 font-medium">Access Restricted</p>
                  <p className="text-red-600 text-sm">Members cannot view groups. Please contact your group leader.</p>
                </div>
              )}
              {isDeacon && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-yellow-700 font-medium">View Only Access</p>
                  <p className="text-yellow-600 text-sm">Deacons can view groups but cannot create, edit, or delete them.</p>
                </div>
              )}
            </div>
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
        ) : isMember ? (
          // MEMBERS: NO ACCESS
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h3>
            <p className="text-red-500 mb-6">
              Members cannot access groups. Please contact your group leader or administrator.
            </p>
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
                   isGroupLeader ? 'You are not assigned as a leader of any group' :
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
                const canManage = canManageGroup(group.id);
                const canView = canViewGroup(group.id);
                const canEdit = canEditGroup(group);
                const canDelete = canDeleteGroup(group);
                const showActions = canSeeActionButtons(group);
                
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
                            {isDeacon && (
                              <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                View Only
                              </span>
                            )}
                            {canManage && !isDeacon ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                Can Manage
                              </span>
                            ) : canView ? (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                View Only
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      {showActions && (
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
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Meetings
                        </button>
                        {canManage && !isDeacon && ( // Deacons cannot manage groups
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

        {/* Modals */}
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{selectedGroup.name} - Meetings</h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No meetings scheduled</p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(meeting.meeting_date).toLocaleDateString()}
                            {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                          </div>
                          {meeting.topic && (
                            <div className="text-sm text-gray-600 mt-1">Topic: {meeting.topic}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                            meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {meeting.status}
                          </span>
                          {meeting.status === 'completed' && (
                            <button
                              onClick={() => openReportModal(meeting)}
                              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <Printer className="h-3 w-3" />
                              View Report
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showReportModal && selectedMeetingForReport && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
              <div className="flex justify-between items-center mb-6 print:mb-8">
                <h3 className="text-2xl font-bold text-gray-900 print:text-black print:text-3xl">
                  Group Meeting Report
                </h3>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Report
                  </button>
                  <button
                    onClick={closeAllModals}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mb-8 pb-6 border-b-2 border-gray-300 print:border-black">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 print:text-black mb-2">
                    {selectedGroup.name}
                  </h1>
                  <p className="text-lg text-gray-600 print:text-black">Group Meeting Attendance Report</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Date</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {new Date(selectedMeetingForReport.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Time</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.meeting_time || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Location</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.location || selectedGroup.location || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Topic</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.topic || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 print:text-black mb-4">Attendance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 print:bg-blue-50 border border-blue-200 print:border-blue-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 print:text-blue-700 font-medium">Total Members</p>
                        <p className="text-3xl font-bold text-blue-700 print:text-blue-900">
                          {getAttendanceStats().total}
                        </p>
                      </div>
                      <Users className="h-10 w-10 text-blue-400 print:text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-green-50 print:bg-green-50 border border-green-200 print:border-green-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 print:text-green-700 font-medium">Attended</p>
                        <p className="text-3xl font-bold text-green-700 print:text-green-900">
                          {getAttendanceStats().attended}
                        </p>
                      </div>
                      <CheckCircle className="h-10 w-10 text-green-400 print:text-green-600" />
                    </div>
                    <p className="text-xs text-green-600 print:text-green-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().attended / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                  <div className="bg-red-50 print:bg-red-50 border border-red-200 print:border-red-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 print:text-red-700 font-medium">Absent</p>
                        <p className="text-3xl font-bold text-red-700 print:text-red-900">
                          {getAttendanceStats().absent}
                        </p>
                      </div>
                      <X className="h-10 w-10 text-red-400 print:text-red-600" />
                    </div>
                    <p className="text-xs text-red-600 print:text-red-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().absent / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 print:text-yellow-700 font-medium">Absent w/ Reason</p>
                        <p className="text-3xl font-bold text-yellow-700 print:text-yellow-900">
                          {getAttendanceStats().absentWithReason}
                        </p>
                      </div>
                      <AlertCircle className="h-10 w-10 text-yellow-400 print:text-yellow-600" />
                    </div>
                    <p className="text-xs text-yellow-600 print:text-yellow-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().absentWithReason / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 print:text-black mb-4">Detailed Attendance</h4>
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 print:bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 print:text-gray-700">No attendance records found</p>
                  </div>
                ) : (
                  <>
                    {getAttendanceStats().attended > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-green-700 print:text-green-800 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Present ({getAttendanceStats().attended})
                        </h5>
                        <div className="bg-green-50 print:bg-green-50 border border-green-200 print:border-green-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'present')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  <span className="text-gray-900 print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {getAttendanceStats().absent > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-red-700 print:text-red-800 mb-3 flex items-center gap-2">
                          <X className="h-5 w-5" />
                          Absent ({getAttendanceStats().absent})
                        </h5>
                        <div className="bg-red-50 print:bg-red-50 border border-red-200 print:border-red-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  <span className="text-gray-900 print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {getAttendanceStats().absentWithReason > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-yellow-700 print:text-yellow-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Absent with Notes ({getAttendanceStats().absentWithReason})
                        </h5>
                        <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-lg p-4">
                          <div className="space-y-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent_with_reason')
                              .map((record) => (
                                <div key={record.id} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                                  <div className="flex-1">
                                    <span className="text-gray-900 print:text-black font-medium">
                                      {record.members?.name} {record.members?.surname}
                                    </span>
                                    {record.notes && (
                                      <p className="text-sm text-gray-600 print:text-gray-700 mt-1">
                                        Notes: {record.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedMeetingForReport.notes && (
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 print:text-black mb-3">Meeting Notes</h4>
                  <div className="bg-gray-50 print:bg-gray-50 border border-gray-200 print:border-gray-300 rounded-lg p-4">
                    <p className="text-gray-700 print:text-black whitespace-pre-wrap">
                      {selectedMeetingForReport.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-600 text-center">
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {showWorkflowModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Manage {selectedGroup.name}</h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <GroupManagementWorkflow
                group={selectedGroup}
                meetings={meetings}
                members={members}
                onClose={closeAllModals}
                onSuccess={(message) => {
                  setSuccess(message);
                  setTimeout(() => setSuccess(null), 3000);
                }}
                onError={(message) => {
                  setError(message);
                  setTimeout(() => setError(null), 3000);
                }}
              />
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
