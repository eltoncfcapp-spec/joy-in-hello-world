import { Plus, Users, MapPin, Edit, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../path-to-your-auth-context';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  leader_id: string | null;
  leader: { name: string; surname: string } | null;
}

const CellGroups = () => {
  const { profile, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; surname: string }[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    leaderId: '',
    location: '',
    meetingDay: '',
  });
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    leader_id: '',
    location: '',
    meeting_day: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCellGroups();
    fetchMembers();
  }, []);

  const fetchCellGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select(`
        id,
        name,
        location,
        meeting_day,
        leader_id,
        leader:members!leader_id(name, surname)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching cell groups:', error);
      setError('Failed to fetch cell groups');
    } else {
      setCellGroups(data || []);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, surname, is_leader, role')
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
      setError('Failed to fetch members');
    } else {
      setMembers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!user) {
      setError('You must be logged in to create a cell group');
      setLoading(false);
      return;
    }

    // Check permission from both user_roles and members table
    const hasPermission = profile?.isAdmin || profile?.role === 'leader';
    
    if (!hasPermission) {
      setError('You do not have permission to create cell groups. Only admins and leaders can create cell groups.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('cell_groups').insert({
      name: formData.groupName,
      leader_id: formData.leaderId || null,
      location: formData.location || null,
      meeting_day: formData.meetingDay || null,
    });

    if (insertError) {
      console.error('Error creating cell group:', insertError);
      setError(`Error creating cell group: ${insertError.message}`);
    } else {
      setShowForm(false);
      setFormData({ groupName: '', leaderId: '', location: '', meetingDay: '' });
      fetchCellGroups();
    }
    
    setLoading(false);
  };

  const startEditing = (group: CellGroup) => {
    setEditingGroup(group.id);
    setEditFormData({
      name: group.name,
      leader_id: group.leader_id || '',
      location: group.location || '',
      meeting_day: group.meeting_day || '',
    });
  };

  const cancelEditing = () => {
    setEditingGroup(null);
    setEditFormData({ name: '', leader_id: '', location: '', meeting_day: '' });
  };

  const handleEditSubmit = async (groupId: string) => {
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('cell_groups')
      .update({
        name: editFormData.name,
        leader_id: editFormData.leader_id || null,
        location: editFormData.location || null,
        meeting_day: editFormData.meeting_day || null,
      })
      .eq('id', groupId);

    if (updateError) {
      console.error('Error updating cell group:', updateError);
      setError(`Error updating cell group: ${updateError.message}`);
    } else {
      setEditingGroup(null);
      setEditFormData({ name: '', leader_id: '', location: '', meeting_day: '' });
      fetchCellGroups();
    }
    
    setLoading(false);
  };

  // Check if user can create cell groups
  const canCreateCellGroup = profile?.isAdmin || profile?.role === 'leader';

  // Check if user can edit a specific cell group
  const canEditCellGroup = (group: CellGroup) => {
    if (profile?.isAdmin) return true;
    // User is the leader of this cell group (checking against members table)
    if (group.leader_id === user?.id) return true;
    return false;
  };

  // Check if user can view cell groups
  const canViewCellGroup = (group: CellGroup) => {
    if (profile?.isAdmin) return true;
    // User is the leader of this cell group
    if (group.leader_id === user?.id) return true;
    // User is a member of this cell group
    if (profile?.cell_group_id === group.id) return true;
    return false;
  };

  // Filter cell groups based on user permissions
  const visibleCellGroups = cellGroups.filter(group => canViewCellGroup(group));

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        {canCreateCellGroup && (
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

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {showForm && canCreateCellGroup && (
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
                  {members
                    .filter(member => member.is_leader || member.role === 'leader')
                    .map((member) => (
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
                {loading ? 'Creating...' : 'Save Cell Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {visibleCellGroups.map((group) => (
          <div key={group.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {editingGroup === group.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-xl font-semibold"
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Leader</label>
                        <select
                          value={editFormData.leader_id}
                          onChange={(e) => setEditFormData({ ...editFormData, leader_id: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        >
                          <option value="">Select leader</option>
                          {members
                            .filter(member => member.is_leader || member.role === 'leader')
                            .map((member) => (
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
                          value={editFormData.location}
                          onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Meeting Day</label>
                        <select
                          value={editFormData.meeting_day}
                          onChange={(e) => setEditFormData({ ...editFormData, meeting_day: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          required
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
                  </div>
                ) : (
                  <>
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
                    </div>
                  </>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mt-2">
                  {editingGroup === group.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSubmit(group.id)}
                        disabled={loading}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={loading}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">{group.meeting_day || 'No meeting day set'}</div>
                      {canEditCellGroup(group) && (
                        <button
                          onClick={() => startEditing(group)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CellGroups;
