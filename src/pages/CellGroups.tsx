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

const CellGroups = () => {
  const { profile, user } = useAuth();
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

  // Check if user can create cell groups (only Admin/Pastor)
  const canCreateGroups = () => {
    if (!profile) return false;
    return profile.role === 'admin' || profile.role === 'pastor';
  };

  // Check if user can manage specific cell group
  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can manage all groups
    if (profile.role === 'admin' || profile.role === 'pastor') {
      return true;
    }
    
    // Group leaders can only manage their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase() || 
        assignedGroup === group.id
      );
    }
    
    // Check if user is the leader of this group
    if (group.leader_id === profile.id) {
      return true;
    }

    return false;
  };

  // Check if user can view specific cell group
  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can view all groups
    if (profile.role === 'admin' || profile.role === 'pastor') {
      return true;
    }
    
    // Group leaders can view their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase() || 
        assignedGroup === group.id
      );
    }
    
    // Regular members can only view groups they are members of
    if (profile.role === 'member') {
      const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
      const isMemberByCellGroupId = profile.cell_group_id === group.id;
      return isMemberOfGroup || isMemberByCellGroupId || false;
    }
    
    return false;
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
      console.log('🔍 Fetching cell groups...');
      
      let query = supabase
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

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching cell groups:', error);
        throw error;
      }
      
      console.log('✅ Cell groups fetched:', data?.length);
      
      const cellGroupsData = data || [];
      
      // Map the data properly
      const mappedGroups = cellGroupsData.map(group => ({
        ...group,
        members: group.cell_group_members || []
      }));
      
      setAllCellGroups(mappedGroups as CellGroup[]);
      
      // Apply filtering based on user permissions
      if (profile) {
        const filtered = mappedGroups.filter(group => canViewGroup(group as CellGroup));
        setCellGroups(filtered as CellGroup[]);
      }
      
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
      if (profile.role === 'admin' || profile.role === 'pastor') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission - only admin/pastor can create groups
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups. Only administrators and pastors can create new cell groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!formData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      console.log('🔄 Creating cell group with data:', formData);
      console.log('👤 Current user ID:', user?.id);
      console.log('🎭 Current user role:', profile?.role);

      // First, create the cell group
      const { data: groupData, error: groupError } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          meeting_day: formData.meeting_day || null,
          meeting_time: formData.meeting_time || null,
          leader_id: formData.leader_id || null,
        })
        .select()
        .single();

      if (groupError) {
        console.error('❌ Error creating cell group:', groupError);
        throw groupError;
      }

      console.log('✅ Cell group created:', groupData);

      // If leader was assigned, add them to cell_group_members as leader
      if (formData.leader_id && groupData) {
        console.log('🔄 Adding leader to group members...');
        const { error: memberError } = await supabase
          .from('cell_group_members')
          .insert({
            cell_group_id: groupData.id,
            member_id: formData.leader_id,
            role: 'leader'
          });

        if (memberError) {
          console.error('❌ Error adding leader to group members:', memberError);
          // Don't throw here - the group was created successfully
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
      
      console.log('🎉 Cell group creation completed successfully');
    } catch (error: any) {
      console.error('💥 Error creating cell group:', error);
      
      // Provide more specific error messages
      if (error.code === '42501') {
        setError('Permission denied: You do not have permission to create cell groups. Please contact an administrator.');
      } else if (error.code === '23505') {
        setError('A cell group with this name already exists. Please choose a different name.');
      } else {
        setError(`Error creating cell group: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (keep the rest of your existing functions like handleUpdateGroup, handleDeleteGroup, etc.)

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to edit this cell group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Updating cell group:', selectedGroup.id);
      
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

      if (error) {
        console.error('❌ Error updating cell group:', error);
        throw error;
      }

      // Update leader in cell_group_members if changed
      if (formData.leader_id && selectedGroup.leader_id !== formData.leader_id) {
        // Remove previous leader role if exists
        if (selectedGroup.leader_id) {
          await supabase
            .from('cell_group_members')
            .update({ role: 'member' })
            .eq('cell_group_id', selectedGroup.id)
            .eq('member_id', selectedGroup.leader_id);
        }

        // Add or update new leader role
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
      
      console.log('✅ Cell group updated successfully');
    } catch (error: any) {
      console.error('💥 Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of your component JSX remains the same)

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
              {profile?.role === 'admin' || profile?.role === 'pastor'
                ? 'Full administrative access to all cell groups' 
                : profile?.role === 'group_leader'
                ? `Managing ${profile?.assigned_groups?.length || 0} assigned group(s)`
                : `Viewing your cell group - ${profile?.role} access`
              }
            </p>
            {!(profile?.role === 'admin' || profile?.role === 'pastor') && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {profile?.role === 'group_leader' 
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

        {/* ... rest of your JSX remains the same */}
      </div>
    </div>
  );
};

export default CellGroups;
