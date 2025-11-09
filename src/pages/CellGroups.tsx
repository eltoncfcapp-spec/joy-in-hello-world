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
  is_leader?: boolean | null;
}

const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const isAdminOrPastor = (role: string): boolean => {
  return role === 'admin' || role === 'pastor';
};

const canManageAllGroups = (permissions: string[] = []): boolean => {
  return hasPermission(permissions, 'manage_groups');
};

const isUserLeader = (profile: any): boolean => {
  return profile?.role === 'group_leader' || profile?.is_leader === true;
};

const CellGroups = () => {
  const { profile, groupMatches, groupMatchesLoaded } = useAuth(); // Added groupMatchesLoaded
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
  const [dataLoaded, setDataLoaded] = useState(false); // NEW: Track if data is fully loaded

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getCellGroupMatchesForUser = () => {
    if (!profile || !groupMatches || groupMatches.length === 0) return [];
    
    const cellGroupMatches = groupMatches.filter(match => 
      (match.match_type === 'EXACT_MATCH' || 
       match.match_type === 'PARTIAL_MATCH_GROUP_CONTAINS_ASSIGNED' ||
       match.match_type === 'PARTIAL_MATCH_ASSIGNED_CONTAINS_GROUP' ||
       match.match_type === 'WHITESPACE_INSENSITIVE_MATCH') &&
      match.group_id
    );
    
    console.log('🔍 Cell Group Matches for user:', cellGroupMatches.map(m => ({
      groupId: m.group_id,
      groupName: m.group_name,
      matchType: m.match_type,
      assignedGroup: m.assigned_group_normalized
    })));
    
    return cellGroupMatches;
  };

  const canCreateGroups = () => {
    if (!profile) return false;
    return isAdminOrPastor(profile.role);
  };

  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    console.log('🔍 Checking manage permissions for cell group:', group.name, {
      userRole: profile.role,
      originalRole: profile.originalRole,
      isLeader: profile.is_leader,
      assignedGroups: profile.assigned_groups,
      groupLeaderId: group.leader_id,
      userId: profile.id,
      cellGroupMatches: getCellGroupMatchesForUser().length
    });
    
    if (isAdminOrPastor(profile.role)) {
      console.log('✅ Admin/Pastor can manage all cell groups');
      return true;
    }
    
    if (canManageAllGroups(profile.permissions)) {
      console.log('✅ User has manage_groups permission - can manage all cell groups');
      return true;
    }
    
    if (isUserLeader(profile)) {
      const userCellGroupMatches = getCellGroupMatchesForUser();
      
      const canManage = userCellGroupMatches.some(match => {
        const groupMatch = match.group_id === group.id;
        
        if (groupMatch) {
          console.log(`✅ Leader can manage cell group "${group.name}" via cell group match:`, {
            matchType: match.match_type,
            assignedGroup: match.assigned_group_normalized,
            cellGroupName: match.group_name,
            cellGroupId: match.group_id
          });
        }
        
        return groupMatch;
      });
      
      if (canManage) return true;
      
      if (profile.assigned_groups && profile.assigned_groups.length > 0) {
        const fallbackMatch = profile.assigned_groups.some(assignedGroup => {
          const assignedGroupName = assignedGroup.toString().toLowerCase().trim();
          const cellGroupName = group.name.toLowerCase().trim();
          
          const canManageCellGroup = assignedGroupName === cellGroupName || 
                                cellGroupName.includes(assignedGroupName) || 
                                assignedGroupName.includes(cellGroupName) ||
                                cellGroupName.replace(/\s+/g, '') === assignedGroupName.replace(/\s+/g, '');
          
          if (canManageCellGroup) {
            console.log(`✅ Leader can manage cell group "${group.name}" via fallback matching:`, {
              assignedGroup: assignedGroupName,
              cellGroupName: cellGroupName
            });
          }
          
          return canManageCellGroup;
        });
        
        if (fallbackMatch) return true;
      }
    }
    
    if (group.leader_id === profile.id) {
      console.log('✅ User is the leader of this cell group (leader_id match)');
      return true;
    }

    const isGroupLeader = group.members?.some(member => 
      member.member_id === profile.id && member.role === 'leader'
    );
    if (isGroupLeader) {
      console.log('✅ User is leader in cell_group_members for this cell group');
      return true;
    }

    console.log('❌ User cannot manage this cell group');
    return false;
  };

  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    if (isAdminOrPastor(profile.role)) {
      return true;
    }
    
    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      return true;
    }
    
    if (isUserLeader(profile)) {
      const userCellGroupMatches = getCellGroupMatchesForUser();
      
      const canView = userCellGroupMatches.some(match => match.group_id === group.id);
      
      if (canView) {
        console.log(`✅ Leader can view cell group "${group.name}" via cell group match`);
        return true;
      }
      
      if (profile.assigned_groups && profile.assigned_groups.length > 0) {
        return profile.assigned_groups.some(assignedGroup => {
          const assignedGroupName = assignedGroup.toString().toLowerCase().trim();
          const cellGroupName = group.name.toLowerCase().trim();
          
          return assignedGroupName === cellGroupName || 
                 cellGroupName.includes(assignedGroupName) || 
                 assignedGroupName.includes(cellGroupName) ||
                 cellGroupName.replace(/\s+/g, '') === assignedGroupName.replace(/\s+/g, '');
        });
      }
    }
    
    if (profile.role === 'member' && !profile.is_leader) {
      const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
      const isMemberByCellGroupId = profile.cell_group_id === group.id;
      
      return isMemberOfGroup || isMemberByCellGroupId || false;
    }
    
    return false;
  };

  const getFilteredCellGroups = () => {
    if (!profile) return [];

    console.log('🔍 Filtering cell groups for user:', {
      role: profile.role,
      originalRole: profile.originalRole,
      is_leader: profile.is_leader,
      assigned_groups: profile.assigned_groups,
      permissions: profile.permissions,
      cellGroupMatches: getCellGroupMatchesForUser().length
    });

    if (isAdminOrPastor(profile.role)) {
      console.log('👑 Admin/Pastor - showing all cell groups');
      return allCellGroups;
    }

    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      console.log('🔑 User has view/manage permission - showing all cell groups');
      return allCellGroups;
    }

    let userCellGroups: CellGroup[] = [];

    if (isUserLeader(profile)) {
      const userCellGroupMatches = getCellGroupMatchesForUser();
      
      console.log('👨‍💼 Leader with cell group matches:', userCellGroupMatches.map(m => ({
        cellGroupId: m.group_id,
        cellGroupName: m.group_name,
        matchType: m.match_type,
        assignedGroup: m.assigned_group_normalized
      })));

      if (userCellGroupMatches.length > 0) {
        userCellGroups = allCellGroups.filter(cellGroup => {
          const canView = userCellGroupMatches.some(match => match.group_id === cellGroup.id);
          
          if (canView) {
            console.log(`✅ Leader can view cell group "${cellGroup.name}" via cell group match`);
          } else {
            console.log(`❌ Leader cannot view cell group "${cellGroup.name}" - no cell group match`);
          }
          
          return canView;
        });
      } else {
        console.log('🔄 No cell group matches found, using assigned_groups fallback for cell groups');
        userCellGroups = allCellGroups.filter(cellGroup => {
          const canView = profile.assigned_groups?.some(assignedGroup => {
            const assignedGroupName = assignedGroup.toString().toLowerCase().trim();
            const cellGroupName = cellGroup.name.toLowerCase().trim();
            
            const match = assignedGroupName === cellGroupName || 
                         cellGroupName.includes(assignedGroupName) || 
                         assignedGroupName.includes(cellGroupName) ||
                         cellGroupName.replace(/\s+/g, '') === assignedGroupName.replace(/\s+/g, '');
            
            if (match) {
              console.log(`✅ Leader can view cell group "${cellGroup.name}" - matches assigned group "${assignedGroup}"`);
            }
            
            return match;
          });
          
          if (!canView) {
            console.log(`❌ Leader cannot view cell group "${cellGroup.name}" - no matching assigned group`);
          }
          
          return canView;
        });
      }
    }

    if (profile.role === 'member' && !profile.is_leader) {
      console.log('👤 Regular member filtering for cell groups');
      const memberGroups = allCellGroups.filter(cellGroup => {
        const isMemberOfGroup = cellGroup.members?.some(member => member.member_id === profile.id);
        const isMemberByCellGroupId = profile.cell_group_id === cellGroup.id;
        
        const canView = isMemberOfGroup || isMemberByCellGroupId;
        
        if (canView) {
          console.log(`✅ Member can view cell group "${cellGroup.name}" - is member`);
        }
        
        return canView;
      });
      userCellGroups = [...userCellGroups, ...memberGroups];
    }

    const uniqueCellGroups = userCellGroups.filter((cellGroup, index, self) => 
      index === self.findIndex(g => g.id === cellGroup.id)
    );

    console.log(`📊 Final filtered cell groups:`, {
      allCellGroups: allCellGroups.length,
      filteredCellGroups: uniqueCellGroups.length,
      userCellGroups: uniqueCellGroups.map(g => ({ id: g.id, name: g.name })),
      userRole: profile.role,
      originalRole: profile.originalRole,
      isLeader: profile.is_leader,
      cellGroupMatchesUsed: getCellGroupMatchesForUser().length
    });

    return uniqueCellGroups;
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
      console.log('📡 Fetching cell groups from database...');
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
      
      console.log('📋 All cell groups from database:', cellGroupsData.map(g => ({ 
        id: g.id, 
        name: g.name, 
        leader_id: g.leader_id,
        members_count: g.cell_group_members?.length || 0 
      })));
      
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

  // Check permissions and load data - UPDATED to wait for group matches
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      console.log('🔐 Checking access for user to cell groups:', {
        id: profile.id,
        role: profile.role,
        originalRole: profile.originalRole,
        is_leader: profile.is_leader,
        assigned_groups: profile.assigned_groups,
        permissions: profile.permissions,
        cellGroupMatches: getCellGroupMatchesForUser().length,
        groupMatchesLoaded: groupMatchesLoaded // Check if group matches are loaded
      });

      // Wait for group matches to be loaded before checking access
      if (!groupMatchesLoaded) {
        console.log('⏳ Waiting for group matches to load...');
        return;
      }

      let userHasAccess = false;

      if (isAdminOrPastor(profile.role)) {
        userHasAccess = true;
        console.log('✅ Admin/Pastor - has access to cell groups');
      }
      else if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
        userHasAccess = true;
        console.log('✅ Has view_groups/manage_groups permission - has access to cell groups');
      }
      else if (isUserLeader(profile) && (
        (profile.assigned_groups && profile.assigned_groups.length > 0) || 
        (getCellGroupMatchesForUser().length > 0)
      )) {
        userHasAccess = true;
        console.log('✅ Leader with assigned groups or cell group matches - has access to cell groups');
      }
      else if (profile.role === 'member' && profile.cell_group_id) {
        userHasAccess = true;
        console.log('✅ Member with cell_group_id - has access to cell groups');
      } else {
        console.log('❌ User does not have access to cell groups');
      }
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
        setDataLoaded(true); // Mark data as fully loaded
      } else {
        setInitialLoad(false);
        setDataLoaded(true); // Mark data as fully loaded even if no access
      }
    };

    checkAccessAndLoadData();
  }, [profile, groupMatches, groupMatchesLoaded]); // Added groupMatchesLoaded dependency

  // Update filtered cell groups when allCellGroups or profile changes - UPDATED
  useEffect(() => {
    if (allCellGroups.length > 0 && profile && groupMatchesLoaded && dataLoaded) {
      console.log('🔄 Updating filtered cell groups...');
      const filtered = getFilteredCellGroups();
      setCellGroups(filtered);
    }
  }, [allCellGroups, profile, groupMatches, groupMatchesLoaded, dataLoaded]); // Added dependencies

  // Show loading while checking permissions or waiting for group matches
  if (initialLoad || !groupMatchesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {!groupMatchesLoaded ? 'Loading group matches...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    );
  }

  // Rest of the component remains the same...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      if (formData.leader_id && selectedGroup.leader_id !== formData.leader_id) {
        if (selectedGroup.leader_id) {
          await supabase
            .from('cell_group_members')
            .update({ role: 'member' })
            .eq('cell_group_id', selectedGroup.id)
            .eq('member_id', selectedGroup.leader_id);
        }

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

  // Rest of the component methods remain the same...

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
            Your role: {profile?.originalRole || profile?.role || 'member'}, is_leader: {profile?.is_leader ? 'true' : 'false'}
          </p>
          {profile?.role === 'member' && !profile?.cell_group_id && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You are not assigned to any cell group. Please contact an administrator.
            </p>
          )}
          {isUserLeader(profile) && (!profile?.assigned_groups || profile.assigned_groups.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You are a leader but don't have any assigned cell groups to manage. Please contact an administrator.
            </p>
          )}
        </div>
      </div>
    );
  }

  // The rest of your JSX return remains exactly the same...
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
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
                : isUserLeader(profile)
                ? `Managing ${cellGroups.length} assigned cell group(s) as ${profile?.originalRole || profile?.role}`
                : `Viewing your cell group - ${profile?.originalRole || profile?.role} access`
              }
            </p>
            {!isAdminOrPastor(profile?.role || '') && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {canManageAllGroups(profile?.permissions)
                  ? 'You have full access to manage all cell groups'
                  : isUserLeader(profile)
                  ? `You can only view and manage assigned cell groups: ${profile?.assigned_groups?.join(', ') || 'None'}`
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

        {/* The rest of your JSX remains exactly the same... */}
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

        {/* Rest of your JSX remains exactly the same */}
        {/* ... (all the existing JSX code) ... */}
        
      </div>
    </div>
  );
};

export default CellGroups;
