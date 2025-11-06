import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup { /* ... your existing interface ... */ }
interface CellGroupMember { /* ... your existing interface ... */ }
interface Member { /* ... your existing interface ... */ }

// Helper permission function
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const CellGroups = () => {
  const { profile } = useAuth();

  // State variables
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

  // Permission utility
  const canCreateGroups = () => profile?.isAdmin ?? false;

  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    if (profile.isAdmin) return true;
    if (hasPermission(profile.permissions, 'manage_groups') && profile.assigned_groups) {
      return profile.assigned_groups.some(assigned => assigned.toLowerCase() === group.name.toLowerCase());
    }
    if (group.leader_id === profile.id) return true;
    return false;
  };

  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    if (profile.isAdmin || hasPermission(profile.permissions, 'view_groups')) return true;
    if (profile.role === 'member') {
      return group.members?.some(m => m.member_id === profile.id) ?? false;
    }
    if (hasPermission(profile.permissions, 'manage_groups') && profile.assigned_groups) {
      return profile.assigned_groups.some(assigned => assigned.toLowerCase() === group.name.toLowerCase());
    }
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assigned => assigned.toLowerCase() === group.name.toLowerCase());
    }
    return false;
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchCellGroups(), fetchMembers()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
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
      setAllCellGroups(cellGroupsData);
      // Apply filtering
      const filtered = getFilteredCellGroups();
      setCellGroups(filtered);
    } catch (error) {
      console.error('Error fetching cell groups:', error);
      setError('Error fetching cell groups');
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
      setError('Error fetching members');
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
        .eq('cell_group_id', groupId);

      if (error) throw error;
      setAllCellGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: data || [] } : g));
      // Re-apply filtering
      const filtered = getFilteredCellGroups();
      setCellGroups(filtered);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  // Effect: check permissions & load data
  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }
      const access =
        profile.isAdmin ||
        hasPermission(profile.permissions, 'view_groups') ||
        hasPermission(profile.permissions, 'manage_groups') ||
        (profile.role === 'group_leader' && profile.assigned_groups && profile.assigned_groups.length > 0) ||
        (profile.role === 'member' && allCellGroups.some(g => g.members?.some(m => m.member_id === profile.id)));

      setHasAccess(access);
      if (access) await loadData();
      else setInitialLoad(false);
    };
    checkAccessAndLoad();
  }, [profile]);

  // Filter groups based on permissions
  const getFilteredCellGroups = () => {
    if (!profile) return [];
    if (profile.isAdmin || hasPermission(profile.permissions, 'view_groups')) return allCellGroups;

    let userGroups: CellGroup[] = [];
    if (hasPermission(profile.permissions, 'manage_groups') && profile.assigned_groups) {
      userGroups = allCellGroups.filter(group => profile.assigned_groups.some(assigned => assigned.toLowerCase() === group.name.toLowerCase()));
    }
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      const leaderGroups = allCellGroups.filter(group => profile.assigned_groups.some(assigned => assigned.toLowerCase() === group.name.toLowerCase()));
      userGroups = [...userGroups, ...leaderGroups];
    }
    if (profile.role === 'member') {
      const memberGroups = allCellGroups.filter(group => group.members?.some(m => m.member_id === profile.id));
      userGroups = [...userGroups, ...memberGroups];
    }
    // Remove duplicates
    return userGroups.filter((g, index, self) => self.findIndex(item => item.id === g.id) === index);
  };

  // Handlers for create, update, delete, manage members
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups.');
      return;
    }
    // ... create logic ...
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to edit this group.');
      return;
    }
    // ... update logic ...
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = allCellGroups.find(g => g.id === groupId);
    if (!group || !canManageGroup(group)) {
      setError('You do not have permission to delete this group.');
      return;
    }
    if (!confirm('Are you sure?')) return;
    // ... delete logic ...
  };

  const handleAddMembersToGroup = async (groupId: string, memberIds: string[], role: string = 'member') => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group.');
      return;
    }
    // ... add members logic ...
  };

  const handleRemoveMemberFromGroup = async (groupMemberId: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group.');
      return;
    }
    // ... remove member logic ...
  };

  const handleUpdateMemberRole = async (groupMemberId: string, newRole: string) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to manage this group.');
      return;
    }
    // ... update role logic ...
  };

  // Get available members for adding
  const availableMembers = members.filter(member =>
    !selectedGroup?.members?.some(m => m.member_id === member.id) &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Render
  if (initialLoad) {
    return (
      <div className="min-h-screen ...">
        {/* Loading indicator */}
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen ...">
        {/* Access Denied */}
      </div>
    );
  }

  return (
    <div className="min-h-screen ...">
      {/* Header and Create Button */}
      {canCreateGroups() && (
        <button onClick={() => setShowForm(!showForm)} className="...">
          <Plus /> {showForm ? 'Cancel' : 'Create Cell Group'}
        </button>
      )}

      {/* Create / Edit Form (if showForm or showEditForm) */}
      {/* ... Your form code ... */}

      {/* Cell Groups List */}
      <div className="grid ...">
        {loading && cellGroups.length === 0 ? (
          // Loading
        ) : cellGroups.length === 0 ? (
          // No groups message
        ) : (
          cellGroups.map((group) => {
            const canManage = canManageGroup(group);
            const canView = canViewGroup(group);
            return (
              <div key={group.id} className="...">
                {/* Group Card */}
                <div className="...">
                  {/* Group Info */}
                  {/* ... */}
                </div>
                {/* Action Buttons */}
                {canManage && (
                  <>
                    <button onClick={() => {
                      setSelectedGroup(group);
                      setFormData({ /* populate form data */ });
                      setShowEditForm(true);
                    }} className="...">
                      <Edit />
                    </button>
                    <button onClick={() => handleDeleteGroup(group.id)} className="...">
                      <Trash2 />
                    </button>
                  </>
                )}
                {/* View Members Button */}
                <button onClick={() => {
                  setSelectedGroup(group);
                  setShowMembersModal(true);
                }} className="...">
                  View Members
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ======= Edit Group Modal ======= */}
      {showEditForm && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Cell Group</h3>
              <button onClick={() => setShowEditForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {/* Form */}
            <form onSubmit={handleUpdateGroup} className="space-y-6">
              {/* ... same form fields as above, pre-filled with selectedGroup data ... */}
              {/* Save / Cancel buttons */}
            </form>
          </div>
        </div>
      )}

      {/* ======= Members Management Modal ======= */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name} - Members ({selectedGroup.members?.length || 0})</h3>
              <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {/* Add Members Section */}
            {canManageGroup(selectedGroup) && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
                {/* Search and Add Members */}
                {/* ... */}
                {/* Available Members List */}
                {/* ... */}
                {/* Add as Role Dropdown */}
                {/* ... */}
              </div>
            )}

            {/* Current Members List */}
            <div>
              {/* ... */}
              {selectedGroup.members?.length === 0 ? (
                // No members message
              ) : (
                // Members list with role change and remove buttons if canManageGroup
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellGroups;
{/* Edit modal - Only show if user can manage this group */}
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
          {/* Group Name */}
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
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Meeting Day */}
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
          {/* Meeting Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
            <input
              type="time"
              value={formData.meeting_time}
              onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Group Leader */}
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
        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

{/* Members modal - Show to all but restrict actions based on permissions */}
{showMembersModal && selectedGroup && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Modal Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {selectedGroup.name} - Members ({selectedGroup.members?.length || 0})
        </h3>
        <button
          onClick={() => setShowMembersModal(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Add Members Section - only if user can manage */}
      {canManageGroup(selectedGroup) && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Members to Group</h4>
          
          <div className="space-y-4">
            {/* Search */}
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
            {/* Available Members List */}
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
                      <div className="font-medium text-gray-900 dark:text-white">{member.name} {member.surname}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.email} • {member.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add as role dropdown */}
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

      {/* Current Members List */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Members {!canManageGroup(selectedGroup) && '(Read Only)'}
        </h4>
        {!selectedGroup.members || selectedGroup.members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No members in this group yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedGroup.members.map((groupMember) => (
              <div key={groupMember.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                {/* Member Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {getInitials(groupMember.member?.name || '', groupMember.member?.surname || '')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{groupMember.member?.name} {groupMember.member?.surname}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{groupMember.member?.phone || 'No phone'}</div>
                  </div>
                </div>

                {/* Role and Actions */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      groupMember.role === 'leader'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : groupMember.role === 'assistant'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {groupMember.role}
                  </span>
                  
                  {/* Only show management controls if user can manage the group */}
                  {canManageGroup(selectedGroup) ? (
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
                  ) : (
                    // Show read-only view for non-managers
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {groupMember.role}
                    </span>
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
