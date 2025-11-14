import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, FileText, Save, Eye, CheckCircle, UserPlus } from 'lucide-react';
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
  members?: any[];
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role?: string | null;
  cell_group_id?: string | null;
}

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [allGroups, setAllGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Permission check functions
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

  const checkCanManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canManageGroup(group.id) || canManageAllGroups();
  };

  const checkCanViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canViewGroup(group.id) || canViewAllGroups();
  };

  // Filter cell groups based on user permissions
  const getFilteredGroups = () => {
    if (!profile) return [];

    if (canViewAllGroups()) {
      return allGroups;
    }

    const userGroupIds = getUserGroups();
    
    const userGroups = allGroups.filter(group => 
      userGroupIds.includes(group.id) || 
      userGroupIds.includes('all_groups') ||
      (profile.cell_group_id && profile.cell_group_id === group.id)
    );

    return userGroups;
  };

  // Fetch all cell groups with members and leaders
  const fetchGroups = async () => {
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, surname, email, phone, cell_group_id, role')
        .order('name');

      if (membersError) {
        console.error('Error fetching members:', membersError);
      }

      const groupsWithMembers = (groupsData || []).map(group => {
        const groupMembers = (membersData || []).filter(member => 
          member.cell_group_id === group.id
        );
        
        const leader = group.leader_id ? 
          (membersData || []).find(member => member.id === group.leader_id) : null;

        return {
          ...group,
          members: groupMembers,
          leader: leader ? {
            id: leader.id,
            name: leader.name,
            surname: leader.surname,
            email: leader.email,
            phone: leader.phone
          } : null
        };
      });
      
      setAllGroups(groupsWithMembers);
      
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

  const fetchAvailableMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or(`cell_group_id.is.null,cell_group_id.eq.${groupId}`)
        .order('name');

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error) {
      console.error('Error fetching available members:', error);
      setAvailableMembers([]);
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

  // Update filtered cell groups when allGroups or profile changes
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
      setError('Failed to load cell groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const openAddMembersModal = async (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
      setError('You do not have permission to add members to this group');
      return;
    }

    setSelectedGroup(group);
    setSelectedMembers([]);
    await fetchAvailableMembers(group.id);
    setShowAddMembersModal(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const addSelectedMembers = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const updates = selectedMembers.map(memberId => 
        supabase
          .from('members')
          .update({ cell_group_id: selectedGroup.id })
          .eq('id', memberId)
      );

      const results = await Promise.all(updates);
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Failed to add some members');
      }

      await fetchGroups();
      await fetchAvailableMembers(selectedGroup.id);
      setSelectedMembers([]);
      setSuccess(`${selectedMembers.length} member(s) added successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding members:', error);
      setError(`Error adding members: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return;

    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);

      if (error) throw error;

      await fetchGroups();
      await fetchAvailableMembers(selectedGroup.id);
      setSuccess('Member removed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error removing member:', error);
      setError(`Error removing member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (group: CellGroup) => {
    if (!checkCanManageGroup(group)) {
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

  const closeAllModals = () => {
    setShowAddMembersModal(false);
    setShowEditForm(false);
    setSelectedGroup(null);
    setSelectedMembers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups. Only administrators and users with manage_all_groups permission can create new cell groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!formData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      const { error } = await supabase.from('cell_groups').insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        leader_id: formData.leader_id || null,
      });

      if (error) throw error;

      await fetchGroups();
      setShowForm(false);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
      setSuccess('Cell group created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating cell group:', error);
      setError(`Error creating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
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

      await fetchGroups();
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
      setSuccess('Cell group updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.surname?.toLowerCase().includes(searchTerm.toLowerCase())
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
              {showForm ? 'Cancel' : 'Create Cell Group'}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search cell groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
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
                    placeholder="Enter meeting location"
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
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader (Optional)</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a leader</option>
                    {members.filter(m => m.role === 'admin' || m.role === 'group_leader').map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
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

        {/* Edit Cell Group Form */}
        {showEditForm && selectedGroup && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Cell Group</h2>
            <form onSubmit={handleUpdateGroup} className="space-y-6">
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
                    placeholder="Enter meeting location"
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
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Leader</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No leader assigned</option>
                    {members.filter(m => m.role === 'admin' || m.role === 'group_leader').map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname} {member.email ? `(${member.email})` : ''}
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
                  <Save className="h-5 w-5" />
                  {loading ? 'Updating...' : 'Update Cell Group'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
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
          {loading && filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cell groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {canViewAllGroups() ? 'No Cell Groups Yet' : 'No Access to Cell Groups'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {canViewAllGroups()
                  ? 'Create your first cell group to get started' 
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
            filteredGroups.map((group) => {
              const canManage = checkCanManageGroup(group);
              const canView = checkCanViewGroup(group);
              
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
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    
                    {group.location && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{group.location}</span>
                      </div>
                    )}
                    
                    {(group.meeting_day || group.meeting_time) && (
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                        </span>
                      </div>
                    )}
                    
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
                      {canManage && (
                        <>
                          <button
                            onClick={() => openAddMembersModal(group)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Add members"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditForm(group)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Edit group"
                          >
                            <Edit className="h-4 w-4" />
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

        {/* Add Members Modal */}
        {showAddMembersModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Add Members to {selectedGroup.name}
                  </h2>
                  <button
                    onClick={closeAllModals}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {availableMembers.filter(member => !selectedGroup.members?.some(m => m.id === member.id)).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </p>
                          {member.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMemberSelection(member.id)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          selectedMembers.includes(member.id)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {selectedMembers.includes(member.id) ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>

                {availableMembers.filter(member => !selectedGroup.members?.some(m => m.id === member.id)).length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No available members to add.
                  </p>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {selectedMembers.length} member(s) selected
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={closeAllModals}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addSelectedMembers}
                      disabled={selectedMembers.length === 0 || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Selected Members'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
