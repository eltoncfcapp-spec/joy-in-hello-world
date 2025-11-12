import { Plus, Users, MapPin, FileText, UserPlus, Calendar, BarChart3, Settings, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  leader_id: string | null;
  leader: { name: string; surname: string } | null;
  member_count?: number;
}

const Groups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; surname: string }[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    leaderId: '',
    location: '',
    meetingDay: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);

  // Check if user has permission to create cell groups
  const canCreateCellGroups = profile?.isAdmin || profile?.role === 'admin' || 
                            profile?.permissions?.includes('manage_groups');

  // Check if user can manage specific group (admin or group leader of that group)
  const canManageGroup = (groupId: string) => {
    return profile?.isAdmin || 
           profile?.role === 'admin' || 
           profile?.userCellGroup?.id === groupId;
  };

  useEffect(() => {
    fetchCellGroups();
    fetchMembers();
  }, []);

  const fetchCellGroups = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(
            name, 
            surname
          )
        `)
        .order('name');

      if (groupsError) {
        console.error('Error fetching cell groups:', groupsError);
        return;
      }

      // Fetch member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);

          if (countError) {
            console.error('Error counting members:', countError);
          }

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setCellGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error in fetchCellGroups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      if (!canCreateCellGroups) return;

      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname')
        .order('name');

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateCellGroups) {
      alert('You do not have permission to create cell groups');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.groupName,
          leader_id: formData.leaderId || null,
          location: formData.location || null,
          meeting_day: formData.meetingDay || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cell group:', error);
        alert(`Error creating cell group: ${error.message}`);
      } else {
        console.log('Created cell group:', data);
        setShowForm(false);
        setFormData({ groupName: '', leaderId: '', location: '', meetingDay: '' });
        fetchCellGroups();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error creating cell group');
    } finally {
      setLoading(false);
    }
  };

  // Action handlers
  const handleAddReport = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`Add Report for ${group.name}\n\nThis would open a form to:\n- Record meeting minutes\n- Mark attendance (present/absent)\n- Add meeting themes\n- Submit reports`);
    // You can implement navigation or open a modal here
  };

  const handleAddMembers = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`Add Members to ${group.name}\n\nThis would open a form to:\n- Add new members to this group\n- Assign existing members\n- Set member roles and permissions`);
    // You can implement navigation or open a modal here
  };

  const handleCreateEvent = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`Create Event for ${group.name}\n\nThis would open a form to:\n- Schedule new events\n- Set event details\n- Invite members\n- Manage event calendar`);
    // You can implement navigation or open a modal here
  };

  const handleViewAnalytics = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`View Analytics for ${group.name}\n\nThis would show:\n- Attendance statistics\n- Growth metrics\n- Member engagement\n- Meeting frequency`);
    // You can implement navigation or open a modal here
  };

  const handleManageGroup = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`Manage ${group.name}\n\nThis would open group settings to:\n- Edit group information\n- Change leader\n- Update meeting details\n- Configure permissions`);
    // You can implement navigation or open a modal here
  };

  const handleViewDetails = (group: CellGroup) => {
    setSelectedGroup(group);
    alert(`View Details for ${group.name}\n\nThis would show:\n- Complete group information\n- Member list\n- Meeting history\n- Recent activities`);
    // You can implement navigation or open a modal here
  };

  // Action cards configuration - FIXED to ensure they show
  const getActionCards = (group: CellGroup) => {
    const cards = [
      {
        id: 'report',
        title: 'Add Report',
        description: 'Submit meeting minutes and attendance',
        icon: FileText,
        color: 'bg-blue-500',
        action: handleAddReport,
        show: canManageGroup(group.id) // Only group leaders and admins
      },
      {
        id: 'members',
        title: 'Add Members',
        description: 'Manage group members',
        icon: UserPlus,
        color: 'bg-green-500',
        action: handleAddMembers,
        show: canManageGroup(group.id) // Only group leaders and admins
      },
      {
        id: 'event',
        title: 'Create Event',
        description: 'Schedule new events',
        icon: Calendar,
        color: 'bg-purple-500',
        action: handleCreateEvent,
        show: canManageGroup(group.id) // Only group leaders and admins
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'See group statistics',
        icon: BarChart3,
        color: 'bg-orange-500',
        action: handleViewAnalytics,
        show: canManageGroup(group.id) || profile?.isAdmin // Group leaders and admins
      },
      {
        id: 'manage',
        title: 'Manage Group',
        description: 'Edit group settings',
        icon: Settings,
        color: 'bg-gray-500',
        action: handleManageGroup,
        show: canManageGroup(group.id) // Only group leaders and admins
      },
      {
        id: 'view',
        title: 'View Details',
        description: 'See complete information',
        icon: Eye,
        color: 'bg-indigo-500',
        action: handleViewDetails,
        show: true // Everyone can view details
      }
    ];

    return cards.filter(card => card.show);
  };

  if (loading && cellGroups.length === 0) {
    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        </div>
        <div className="text-center py-8">Loading cell groups...</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        {canCreateCellGroups && (
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {showForm ? 'Cancel' : 'Create Cell Group'}
          </button>
        )}
      </div>

      {showForm && canCreateCellGroups && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Cell Group</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Group Name</label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Leader</label>
                <select
                  value={formData.leaderId}
                  onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                >
                  <option value="">Select leader</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.surname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Meeting Day</label>
                <select
                  value={formData.meetingDay}
                  onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="px-6 py-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Cell Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!canCreateCellGroups && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You have view-only access to cell groups. Contact an administrator to create or modify groups.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {cellGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cell groups found.
          </div>
        ) : (
          cellGroups.map((group) => {
            const availableActions = getActionCards(group);
            
            return (
              <div key={group.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">{group.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'No leader assigned'}
                        </span>
                      </div>
                      {group.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{group.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Members: {group.member_count || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-2">
                      {group.meeting_day || 'No meeting day set'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {canManageGroup(group.id) ? 'You can manage this group' : 'View only'}
                    </div>
                  </div>
                </div>

                {/* Action Cards Grid */}
                {availableActions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {availableActions.map((card) => {
                        const IconComponent = card.icon;
                        return (
                          <button
                            key={card.id}
                            onClick={() => card.action(group)}
                            className="flex flex-col items-center p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors group"
                            title={card.description}
                          >
                            <div className={`p-2 rounded-full ${card.color} text-white mb-2 group-hover:scale-110 transition-transform`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium text-foreground text-center leading-tight">
                              {card.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Groups;
